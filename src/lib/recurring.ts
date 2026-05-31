import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { RecurringTemplate } from '@/types';

function templatesCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'recurring_templates');
}

export async function addTemplate(
  workspaceId: string,
  data: Omit<RecurringTemplate, 'id'>,
): Promise<void> {
  await addDoc(templatesCol(workspaceId), data);
}

export async function updateTemplate(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<RecurringTemplate, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'recurring_templates', id), patch);
}

export async function deleteTemplate(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'recurring_templates', id));
}

export function subscribeTemplates(
  workspaceId: string,
  cb: (templates: RecurringTemplate[], hasPendingWrites: boolean) => void,
): () => void {
  return onSnapshot(templatesCol(workspaceId), { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Omit<RecurringTemplate, 'id'>) }),
    );
    items.sort((a, b) => a.createdAt - b.createdAt);
    cb(items, snap.metadata.hasPendingWrites);
  });
}
