import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { Category } from '@/types';

function categoriesCol(workspaceId: string) {
  const { db } = getFirebase();
  return collection(db, 'workspaces', workspaceId, 'categories');
}

export async function addCategory(
  workspaceId: string,
  data: Omit<Category, 'id'>,
): Promise<void> {
  await addDoc(categoriesCol(workspaceId), data);
}

export async function updateCategory(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'workspaces', workspaceId, 'categories', id), patch);
}

export async function deleteCategory(workspaceId: string, id: string): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'categories', id));
}

export function subscribeCategories(
  workspaceId: string,
  cb: (categories: Category[]) => void,
): () => void {
  return onSnapshot(categoriesCol(workspaceId), (snap) => {
    const cats = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
    cats.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
    cb(cats);
  });
}
