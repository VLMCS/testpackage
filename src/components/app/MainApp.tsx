import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { Dashboard } from './Dashboard';
import { TransactionsScreen } from './TransactionsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { ProfileScreen } from './ProfileScreen';
import { BottomNav, type Tab } from './BottomNav';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { Loader2 } from 'lucide-react';

export function MainApp() {
  const { activeAccount, workspaceId } = useSession();
  const { categories, loading } = useData();
  const [tab, setTab] = useState<Tab>('home');
  const [addOpen, setAddOpen] = useState(false);

  if (!activeAccount || !workspaceId) return null;

  return (
    <div className="mx-auto max-w-md">
      <main className="min-h-[100dvh] px-4 pb-28 pt-5">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {tab === 'home' && <Dashboard onViewAll={() => setTab('transactions')} />}
            {tab === 'transactions' && <TransactionsScreen />}
            {tab === 'categories' && <CategoriesScreen />}
            {tab === 'profile' && <ProfileScreen />}
          </>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} onAdd={() => setAddOpen(true)} />

      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={workspaceId}
        accountId={activeAccount.id}
        categories={categories}
      />
    </div>
  );
}
