import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { Wallet } from '@/types';

function walletsCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'wallets');
}

export async function addWallet(
  workspaceId: string,
  data: Omit<Wallet, 'id'>,
): Promise<void> {
  await addDoc(walletsCol(workspaceId), data);
}

export async function updateWallet(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<Wallet, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'wallets', id), patch);
}

export async function deleteWallet(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'wallets', id));
}

export function subscribeWallets(
  workspaceId: string,
  cb: (wallets: Wallet[], hasPendingWrites: boolean) => void,
): () => void {
  return onSnapshot(walletsCol(workspaceId), { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
    items.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt - b.createdAt;
    });
    cb(items, snap.metadata.hasPendingWrites);
  });
}
