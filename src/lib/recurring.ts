import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { RecurringTemplate } from '@/types';

/** Resolve the amount a template should use for a given month (yyyy-MM). */
export function effectiveAmountCents(template: RecurringTemplate, monthKey: string): number {
  const override = template.monthlyAmounts?.[monthKey];
  return typeof override === 'number' ? override : template.amountCents;
}

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

/**
 * Set (or clear) the override amount for one month on a template. Pass cents=null
 * to remove the override so that month falls back to the template's default
 * amountCents. Uses Firestore dot-notation so we only touch that one key.
 */
export async function setMonthlyAmount(
  workspaceId: string,
  id: string,
  monthKey: string,
  cents: number | null,
): Promise<void> {
  const { db } = getFirebase();
  const ref = doc(db, 'workspaces', workspaceId, 'recurring_templates', id);
  const path = `monthlyAmounts.${monthKey}`;
  await updateDoc(ref, { [path]: cents === null ? deleteField() : cents });
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
