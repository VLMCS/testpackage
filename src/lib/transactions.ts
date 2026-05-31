import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { Transaction } from '@/types';

function transactionsCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'transactions');
}

export async function addTransaction(
  workspaceId: string,
  data: Omit<Transaction, 'id'>,
): Promise<void> {
  await addDoc(transactionsCol(workspaceId), data);
}

export async function updateTransaction(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<Transaction, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'transactions', id), patch);
}

export async function deleteTransaction(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'transactions', id));
}

export function subscribeTransactions(
  workspaceId: string,
  cb: (transactions: Transaction[]) => void,
): () => void {
  return onSnapshot(transactionsCol(workspaceId), (snap) => {
    const txns = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
    // Newest first: by date, then by creation time.
    txns.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    cb(txns);
  });
}
