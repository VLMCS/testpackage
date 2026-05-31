import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import { ACCOUNT_DEFS, DEFAULT_CATEGORIES, DEFAULT_CURRENCY } from './constants';
import type { Account, Workspace } from '@/types';

const WORKSPACES = 'workspaces';

export async function fetchWorkspace(workspaceId: string): Promise<Workspace | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, WORKSPACES, workspaceId));
  return snap.exists() ? (snap.data() as Workspace) : null;
}

/**
 * Create a brand-new workspace, then seed the two accounts + default categories.
 * The workspace doc is written FIRST and awaited, because the security rules for
 * the subcollection writes check membership via get() on the (now committed)
 * workspace doc.
 */
export async function createWorkspace(workspaceId: string, uid: string): Promise<void> {
  const { db } = getFirebase();
  const now = Date.now();

  const workspace: Workspace = {
    allowedUids: [uid],
    baseCurrency: DEFAULT_CURRENCY,
    createdAt: now,
    schemaVersion: 2,
  };
  await setDoc(doc(db, WORKSPACES, workspaceId), workspace);

  // Seed the two accounts, each with its OWN copy of the default categories.
  const batch = writeBatch(db);
  for (const a of ACCOUNT_DEFS) {
    batch.set(doc(db, WORKSPACES, workspaceId, 'accounts', a.id), {
      name: a.name,
      color: a.color,
      baseCurrency: DEFAULT_CURRENCY,
      avatar: null,
      startingBalanceCents: null,
      pinHash: null,
      pinSalt: null,
      createdAt: now,
    });
    for (const c of DEFAULT_CATEGORIES) {
      batch.set(doc(collection(db, WORKSPACES, workspaceId, 'categories')), {
        accountId: a.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        imageUrl: null,
        color: c.color,
        isDefault: true,
        sortOrder: c.sortOrder,
        excludeFromTop: false,
      });
    }
  }
  await batch.commit();
}

/**
 * Create an additional account (a new user) and seed its categories.
 * `categoryChoice`: 'default' seeds the full default set; 'own' seeds only the
 * special Recurring category so the user starts otherwise blank.
 * Returns the new account id.
 */
export async function createAccount(
  workspaceId: string,
  data: {
    name: string;
    color: string;
    baseCurrency: string;
    startingBalanceCents: number;
    pinHash: string;
    pinSalt: string;
  },
  categoryChoice: 'default' | 'own',
): Promise<string> {
  const { db } = getFirebase();
  const now = Date.now();
  const accRef = doc(collection(db, WORKSPACES, workspaceId, 'accounts'));

  const batch = writeBatch(db);
  batch.set(accRef, {
    name: data.name,
    color: data.color,
    baseCurrency: data.baseCurrency,
    avatar: null,
    startingBalanceCents: data.startingBalanceCents,
    pinHash: data.pinHash,
    pinSalt: data.pinSalt,
    createdAt: now,
  });

  const seeds =
    categoryChoice === 'default'
      ? DEFAULT_CATEGORIES
      : DEFAULT_CATEGORIES.filter((c) => c.type === 'recurring');
  for (const c of seeds) {
    batch.set(doc(collection(db, WORKSPACES, workspaceId, 'categories')), {
      accountId: accRef.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      imageUrl: null,
      color: c.color,
      isDefault: true,
      sortOrder: c.sortOrder,
      excludeFromTop: false,
    });
  }
  // Offline-first: don't await the commit. The doc id is generated client-side,
  // and the batch applies to the local cache immediately, so the new account is
  // usable right away and syncs to the server on reconnect.
  batch.commit().catch((e) => console.error('Account creation will sync on reconnect:', e));
  return accRef.id;
}

/** Add this device's anonymous UID to an existing workspace's allowlist. */
export async function joinWorkspace(workspaceId: string, uid: string): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, WORKSPACES, workspaceId), { allowedUids: arrayUnion(uid) });
}

export function subscribeWorkspace(
  workspaceId: string,
  cb: (ws: Workspace | null) => void,
): () => void {
  const { db } = getFirebase();
  return onSnapshot(doc(db, WORKSPACES, workspaceId), (snap) => {
    cb(snap.exists() ? (snap.data() as Workspace) : null);
  });
}

export function subscribeAccounts(
  workspaceId: string,
  cb: (accounts: Account[]) => void,
): () => void {
  const { db } = getFirebase();
  return onSnapshot(collection(db, WORKSPACES, workspaceId, 'accounts'), (snap) => {
    const accounts = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Omit<Account, 'id'>) }) as Account,
    );
    cb(accounts);
  });
}

export async function setAccountPinAndBalance(
  workspaceId: string,
  accountId: string,
  pinHash: string,
  pinSalt: string,
  startingBalanceCents: number,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, WORKSPACES, workspaceId, 'accounts', accountId), {
    pinHash,
    pinSalt,
    startingBalanceCents,
  });
}

export async function updateBaseCurrency(workspaceId: string, baseCurrency: string): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, WORKSPACES, workspaceId), { baseCurrency });
}

export async function updateAccountProfile(
  workspaceId: string,
  accountId: string,
  patch: { name?: string; color?: string; avatar?: string | null; baseCurrency?: string },
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, WORKSPACES, workspaceId, 'accounts', accountId), patch);
}
