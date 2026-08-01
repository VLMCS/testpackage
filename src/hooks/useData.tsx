import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { subscribeCategories } from '@/lib/categories';
import { subscribeTransactions } from '@/lib/transactions';
import { subscribeTemplates } from '@/lib/recurring';
import { subscribeWallets } from '@/lib/wallets';
import { subscribeTransfers } from '@/lib/transfers';
import { subscribePlans } from '@/lib/plans';
import type {
  Category,
  FinancePlan,
  RecurringTemplate,
  Transaction,
  Transfer,
  Wallet,
} from '@/types';

interface DataContextValue {
  categories: Category[];
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
  wallets: Wallet[];
  transfers: Transfer[];
  financePlans: FinancePlan[];
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
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [financePlans, setFinancePlans] = useState<FinancePlan[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [recLoaded, setRecLoaded] = useState(false);
  const [walLoaded, setWalLoaded] = useState(false);
  const [trfLoaded, setTrfLoaded] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [pendingCat, setPendingCat] = useState(false);
  const [pendingTx, setPendingTx] = useState(false);
  const [pendingRec, setPendingRec] = useState(false);
  const [pendingWal, setPendingWal] = useState(false);
  const [pendingTrf, setPendingTrf] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(false);

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
    const unsubTrf = subscribeTransfers(workspaceId, (t, pending) => {
      setTransfers(t);
      setTrfLoaded(true);
      setPendingTrf(pending);
    });
    const unsubPlan = subscribePlans(workspaceId, (p, pending) => {
      setFinancePlans(p);
      setPlanLoaded(true);
      setPendingPlan(pending);
    });
    return () => {
      unsubCats();
      unsubTx();
      unsubRec();
      unsubWal();
      unsubTrf();
      unsubPlan();
    };
  }, [workspaceId]);

  return (
    <DataContext.Provider
      value={{
        categories,
        transactions,
        recurringTemplates,
        wallets,
        transfers,
        financePlans,
        loading: !(catLoaded && txLoaded && recLoaded && walLoaded && trfLoaded && planLoaded),
        pendingWrites:
          pendingCat || pendingTx || pendingRec || pendingWal || pendingTrf || pendingPlan,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
