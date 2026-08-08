import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { BudgetAllocation } from '@/types';

function budgetsCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'budget_allocations');
}

export async function addBudget(
  workspaceId: string,
  data: Omit<BudgetAllocation, 'id'>,
): Promise<void> {
  await addDoc(budgetsCol(workspaceId), data);
}

export async function updateBudget(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<BudgetAllocation, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'budget_allocations', id), patch);
}

export async function deleteBudget(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'budget_allocations', id));
}

export function subscribeBudgets(
  workspaceId: string,
  cb: (budgets: BudgetAllocation[], hasPendingWrites: boolean) => void,
): () => void {
  return onSnapshot(budgetsCol(workspaceId), { includeMetadataChanges: true }, (snap) => {
    const items = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Omit<BudgetAllocation, 'id'>) }),
    );
    items.sort((a, b) => a.createdAt - b.createdAt);
    cb(items, snap.metadata.hasPendingWrites);
  });
}
