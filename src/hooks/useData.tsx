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
  /** True while local changes are still being synced to the server. */
  pendingWrites: boolean;
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
  const [pendingCat, setPendingCat] = useState(false);
  const [pendingTx, setPendingTx] = useState(false);
  const [pendingRec, setPendingRec] = useState(false);

  useEffect(() => {
    const unsubCats = subscribeCategories(workspaceId, (c, pending) => {
      setCategories(c);
      setCatLoaded(true);
      setPendingCat(pending);
    });
    const unsubTx = subscribeTransactions(workspaceId, (t, pending) => {
      setTransactions(t);
      setTxLoaded(true);
      setPendingTx(pending);
    });
    const unsubRec = subscribeTemplates(workspaceId, (r, pending) => {
      setRecurringTemplates(r);
      setRecLoaded(true);
      setPendingRec(pending);
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
        pendingWrites: pendingCat || pendingTx || pendingRec,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
