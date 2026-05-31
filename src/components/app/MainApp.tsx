import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { Dashboard } from './Dashboard';
import { TransactionsScreen } from './TransactionsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { ProfileScreen } from './ProfileScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { RecurringScreen } from '@/components/recurring/RecurringScreen';
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-semibold">Hi, {activeAccount.name}</span>
        <button
          type="button"
          onClick={() => setTab('profile')}
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white ring-offset-background transition-transform active:scale-95"
          style={{ backgroundColor: activeAccount.color }}
        >
          {activeAccount.avatar ? (
            <img src={activeAccount.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            activeAccount.name.charAt(0).toUpperCase()
          )}
        </button>
      </header>

      <main className="min-h-[calc(100dvh-3.25rem)] px-4 pb-28 pt-4">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {tab === 'home' && (
              <Dashboard
                onViewAll={() => setTab('activity')}
                onInsights={() => setTab('analytics')}
              />
            )}
            {tab === 'activity' && <TransactionsScreen />}
            {tab === 'recurring' && <RecurringScreen />}
            {tab === 'categories' && <CategoriesScreen />}
            {tab === 'analytics' && <AnalyticsScreen onBack={() => setTab('home')} />}
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
