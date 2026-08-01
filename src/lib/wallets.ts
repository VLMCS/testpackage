import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
  writeBatch,
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

/**
 * Delete a wallet without losing money. Any transactions assigned to it fall
 * back to Unassigned (walletId cleared), and any transfers touching it are
 * rewritten to point at Unassigned (null) so their counterpart wallet is
 * unaffected. Then the wallet doc itself is removed. Writes are chunked to stay
 * under Firestore's 500-per-batch limit.
 */
export async function deleteWallet(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  const base = ['workspaces', workspaceId] as const;

  const txnSnap = await getDocs(
    query(collection(db, ...base, 'transactions'), where('walletId', '==', id)),
  );
  const fromSnap = await getDocs(
    query(collection(db, ...base, 'transfers'), where('fromWalletId', '==', id)),
  );
  const toSnap = await getDocs(
    query(collection(db, ...base, 'transfers'), where('toWalletId', '==', id)),
  );

  const writers: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
  for (const d of txnSnap.docs) writers.push((b) => b.update(d.ref, { walletId: null }));
  for (const d of fromSnap.docs) writers.push((b) => b.update(d.ref, { fromWalletId: null }));
  for (const d of toSnap.docs) writers.push((b) => b.update(d.ref, { toWalletId: null }));
  writers.push((b) => b.delete(doc(db, ...base, 'wallets', id)));

  for (let i = 0; i < writers.length; i += 450) {
    const batch = writeBatch(db);
    for (const w of writers.slice(i, i + 450)) w(batch);
    await batch.commit();
  }
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
