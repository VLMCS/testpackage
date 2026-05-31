import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { subscribeCategories } from '@/lib/categories';
import { subscribeTransactions } from '@/lib/transactions';
import { subscribeTemplates } from '@/lib/recurring';
import type { Category, RecurringTemplate, Transaction } from '@/types';

interface DataContextValue {
  categories: Category[];
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
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
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [recLoaded, setRecLoaded] = useState(false);

  useEffect(() => {
    const unsubCats = subscribeCategories(workspaceId, (c) => {
      setCategories(c);
      setCatLoaded(true);
    });
    const unsubTx = subscribeTransactions(workspaceId, (t) => {
      setTransactions(t);
      setTxLoaded(true);
    });
    const unsubRec = subscribeTemplates(workspaceId, (r) => {
      setRecurringTemplates(r);
      setRecLoaded(true);
    });
    return () => {
      unsubCats();
      unsubTx();
      unsubRec();
    };
  }, [workspaceId]);

  return (
    <DataContext.Provider
      value={{
        categories,
        transactions,
        recurringTemplates,
        loading: !(catLoaded && txLoaded && recLoaded),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
