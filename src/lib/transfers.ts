import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { Transfer } from '@/types';

function transfersCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'transfers');
}

export async function addTransfer(
  workspaceId: string,
  data: Omit<Transfer, 'id'>,
): Promise<void> {
  await addDoc(transfersCol(workspaceId), data);
}

export async function updateTransfer(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<Transfer, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'transfers', id), patch);
}

export async function deleteTransfer(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'transfers', id));
}

export function subscribeTransfers(
  workspaceId: string,
  cb: (transfers: Transfer[], hasPendingWrites: boolean) => void,
): () => void {
  return onSnapshot(transfersCol(workspaceId), { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transfer, 'id'>) }));
    // Newest first: by date, then creation time.
    items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    cb(items, snap.metadata.hasPendingWrites);
  });
}
