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
    schemaVersion: 1,
  };
  await setDoc(doc(db, WORKSPACES, workspaceId), workspace);

  const batch = writeBatch(db);
  for (const a of ACCOUNT_DEFS) {
    batch.set(doc(db, WORKSPACES, workspaceId, 'accounts', a.id), {
      name: a.name,
      color: a.color,
      startingBalanceCents: null,
      pinHash: null,
      pinSalt: null,
      createdAt: now,
    });
  }
  for (const c of DEFAULT_CATEGORIES) {
    batch.set(doc(collection(db, WORKSPACES, workspaceId, 'categories')), {
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isDefault: true,
      sortOrder: c.sortOrder,
    });
  }
  await batch.commit();
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
  patch: { name?: string; color?: string; avatar?: string | null },
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, WORKSPACES, workspaceId, 'accounts', accountId), patch);
}
