import { doc, writeBatch, type WriteBatch } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { fetchWorkspace } from './workspace';
import type { Account, Category, RecurringTemplate, Transaction } from '@/types';

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
