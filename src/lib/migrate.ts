import { collection, doc, writeBatch, type WriteBatch } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { fetchWorkspace } from './workspace';
import { DEFAULT_WALLETS } from './constants';
import type { Account, Category, RecurringTemplate, Transaction, Wallet } from '@/types';

const WORKSPACES = 'workspaces';

/**
 * Migrate workspaces created before per-account categories existed.
 *
 * Legacy categories had no `accountId` (they were shared). We give EACH account
 * its own copy and remap that account's transactions/templates to point at its
 * copy, so history keeps resolving. Copies use deterministic ids
 * (`${accountId}__${legacyId}`), so this is idempotent — re-running (even after a
 * partial failure) overwrites the same docs instead of duplicating. Legacy docs
 * are left in place (orphaned + invisible) rather than deleted, to stay safe.
 *
 * Returns true if a migration ran.
 */
export async function migrateCategoriesPerAccount(
  workspaceId: string,
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  templates: RecurringTemplate[],
): Promise<boolean> {
  const ws = await fetchWorkspace(workspaceId);
  if (!ws || (ws.schemaVersion ?? 1) >= 2) return false;

  const legacy = categories.filter((c) => !c.accountId);
  const { db } = getFirebase();
  const catId = (accountId: string, legacyId: string) => `${accountId}__${legacyId}`;

  const writers: Array<(b: WriteBatch) => void> = [];

  // 1) A per-account copy of every legacy category.
  for (const a of accounts) {
    for (const L of legacy) {
      const ref = doc(db, WORKSPACES, workspaceId, 'categories', catId(a.id, L.id));
      writers.push((b) =>
        b.set(ref, {
          accountId: a.id,
          name: L.name,
          type: L.type,
          icon: L.icon,
          imageUrl: L.imageUrl ?? null,
          color: L.color,
          isDefault: L.isDefault ?? true,
          sortOrder: L.sortOrder ?? 0,
          excludeFromTop: L.excludeFromTop ?? false,
        }),
      );
    }
  }

  // 2) Remap each account's own transactions + templates to its copies.
  const legacyIds = new Set(legacy.map((c) => c.id));
  for (const t of transactions) {
    if (legacyIds.has(t.categoryId)) {
      const ref = doc(db, WORKSPACES, workspaceId, 'transactions', t.id);
      writers.push((b) => b.update(ref, { categoryId: catId(t.accountId, t.categoryId) }));
    }
  }
  for (const r of templates) {
    if (r.categoryId && legacyIds.has(r.categoryId)) {
      const ref = doc(db, WORKSPACES, workspaceId, 'recurring_templates', r.id);
      writers.push((b) => b.update(ref, { categoryId: catId(r.accountId, r.categoryId as string) }));
    }
  }

  // Commit in chunks to stay under Firestore's 500-write batch limit.
  for (let i = 0; i < writers.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writers.slice(i, i + 400)) w(batch);
    await batch.commit();
  }

  // Bump the schema version last, so a failure mid-way just re-runs safely.
  const finalBatch = writeBatch(db);
  finalBatch.update(doc(db, WORKSPACES, workspaceId), { schemaVersion: 2 });
  await finalBatch.commit();

  return true;
}

/**
 * Merge exact-duplicate categories within each account. Early testing seeded the
 * default category set more than once, so some accounts ended up with several
 * identical copies (e.g. four "Food / Drinks"). For each group of exact dupes
 * (same account/type/name/icon/color) we keep one, remap that account's
 * transactions/templates to it, and delete the rest. Guarded by schemaVersion 3.
 *
 * Returns true if anything was merged.
 */
export async function dedupeCategories(
  workspaceId: string,
  categories: Category[],
  transactions: Transaction[],
  templates: RecurringTemplate[],
): Promise<boolean> {
  const ws = await fetchWorkspace(workspaceId);
  if (!ws || (ws.schemaVersion ?? 1) >= 3) return false;
  const { db } = getFirebase();

  const groups = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.accountId) continue; // ignore legacy orphans (already hidden)
    const key = [c.accountId, c.type, c.name, c.icon, c.color].join('||');
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  const remap = new Map<string, string>(); // duplicateId -> keptId
  const toDelete: string[] = [];
  for (const arr of groups.values()) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => a.id.localeCompare(b.id));
    const keptId = arr[0].id;
    for (const dup of arr.slice(1)) {
      remap.set(dup.id, keptId);
      toDelete.push(dup.id);
    }
  }

  if (toDelete.length === 0) {
    const b = writeBatch(db);
    b.update(doc(db, WORKSPACES, workspaceId), { schemaVersion: 3 });
    await b.commit();
    return false;
  }

  // Remaps first, then deletes (so no transaction is briefly orphaned).
  const writers: Array<(b: WriteBatch) => void> = [];
  for (const t of transactions) {
    const keptId = remap.get(t.categoryId);
    if (keptId) {
      const ref = doc(db, WORKSPACES, workspaceId, 'transactions', t.id);
      writers.push((b) => b.update(ref, { categoryId: keptId }));
    }
  }
  for (const r of templates) {
    if (!r.categoryId) continue;
    const keptId = remap.get(r.categoryId);
    if (keptId) {
      const ref = doc(db, WORKSPACES, workspaceId, 'recurring_templates', r.id);
      writers.push((b) => b.update(ref, { categoryId: keptId }));
    }
  }
  for (const id of toDelete) {
    const ref = doc(db, WORKSPACES, workspaceId, 'categories', id);
    writers.push((b) => b.delete(ref));
  }

  for (let i = 0; i < writers.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writers.slice(i, i + 400)) w(batch);
    await batch.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.update(doc(db, WORKSPACES, workspaceId), { schemaVersion: 3 });
  await finalBatch.commit();

  return true;
}

/**
 * Seed the default wallets for accounts created before Wallets existed. New
 * workspaces are already seeded at creation and start at schemaVersion 4, so this
 * only fires for pre-existing households. Idempotent: an account that already has
 * at least one wallet is skipped, and the version is only bumped after seeding,
 * so a mid-way failure just re-runs safely. Guarded by schemaVersion 4.
 *
 * Returns true if any wallet was seeded.
 */
export async function seedDefaultWallets(
  workspaceId: string,
  accounts: Account[],
  wallets: Wallet[],
): Promise<boolean> {
  const ws = await fetchWorkspace(workspaceId);
  if (!ws || (ws.schemaVersion ?? 1) >= 4) return false;
  const { db } = getFirebase();
  const now = Date.now();

  const haveWallet = new Set(wallets.map((w) => w.accountId));
  const writers: Array<(b: WriteBatch) => void> = [];
  for (const a of accounts) {
    if (haveWallet.has(a.id)) continue; // already has wallets — leave as-is
    for (const w of DEFAULT_WALLETS) {
      const ref = doc(collection(db, WORKSPACES, workspaceId, 'wallets'));
      writers.push((b) =>
        b.set(ref, {
          accountId: a.id,
          name: w.name,
          icon: w.icon,
          color: w.color,
          startingBalanceCents: 0,
          sortOrder: w.sortOrder,
          active: true,
          createdAt: now,
        }),
      );
    }
  }

  for (let i = 0; i < writers.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writers.slice(i, i + 400)) w(batch);
    await batch.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.update(doc(db, WORKSPACES, workspaceId), { schemaVersion: 4 });
  await finalBatch.commit();

  return writers.length > 0;
}
