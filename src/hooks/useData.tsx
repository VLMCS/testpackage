import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { subscribeCategories } from '@/lib/categories';
import { subscribeTransactions } from '@/lib/transactions';
import type { Category, Transaction } from '@/types';

interface DataContextValue {
  categories: Category[];
  transactions: Transaction[];
  loading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}

export function DataProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);

  useEffect(() => {
    const unsubCats = subscribeCategories(workspaceId, (c) => {
      setCategories(c);
      setCatLoaded(true);
    });
    const unsubTx = subscribeTransactions(workspaceId, (t) => {
      setTransactions(t);
      setTxLoaded(true);
    });
    return () => {
      unsubCats();
      unsubTx();
    };
  }, [workspaceId]);

  return (
    <DataContext.Provider value={{ categories, transactions, loading: !(catLoaded && txLoaded) }}>
      {children}
    </DataContext.Provider>
  );
}
