import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { subscribeCategories } from '@/lib/categories';
import { subscribeTransactions } from '@/lib/transactions';
import { subscribeTemplates } from '@/lib/recurring';
import { subscribeWallets } from '@/lib/wallets';
import type { Category, RecurringTemplate, Transaction, Wallet } from '@/types';

interface DataContextValue {
  categories: Category[];
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
  wallets: Wallet[];
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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [recLoaded, setRecLoaded] = useState(false);
  const [walLoaded, setWalLoaded] = useState(false);
  const [pendingCat, setPendingCat] = useState(false);
  const [pendingTx, setPendingTx] = useState(false);
  const [pendingRec, setPendingRec] = useState(false);
  const [pendingWal, setPendingWal] = useState(false);

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
    const unsubWal = subscribeWallets(workspaceId, (w, pending) => {
      setWallets(w);
      setWalLoaded(true);
      setPendingWal(pending);
    });
    return () => {
      unsubCats();
      unsubTx();
      unsubRec();
      unsubWal();
    };
  }, [workspaceId]);

  return (
    <DataContext.Provider
      value={{
        categories,
        transactions,
        recurringTemplates,
        wallets,
        loading: !(catLoaded && txLoaded && recLoaded && walLoaded),
        pendingWrites: pendingCat || pendingTx || pendingRec || pendingWal,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
