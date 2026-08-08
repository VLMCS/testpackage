import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { FinancePlan } from '@/types';

function plansCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'finance_plans');
}

export async function addPlan(
  workspaceId: string,
  data: Omit<FinancePlan, 'id'>,
): Promise<void> {
  await addDoc(plansCol(workspaceId), data);
}

export async function updatePlan(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<FinancePlan, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'finance_plans', id), patch);
}

export async function deletePlan(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'finance_plans', id));
}

export function subscribePlans(
  workspaceId: string,
  cb: (plans: FinancePlan[], hasPendingWrites: boolean) => void,
): () => void {
  return onSnapshot(plansCol(workspaceId), { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinancePlan, 'id'>) }));
    items.sort((a, b) => a.createdAt - b.createdAt);
    cb(items, snap.metadata.hasPendingWrites);
  });
}
