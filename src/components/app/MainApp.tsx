import { lazy, Suspense, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Dashboard } from './Dashboard';
import { BottomNav, type Tab } from './BottomNav';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { gradientFromHex } from '@/lib/theme';
import { Loader2, WifiOff } from 'lucide-react';

// Lazy-load the non-default screens so the initial bundle stays small.
const TransactionsScreen = lazy(() =>
  import('./TransactionsScreen').then((m) => ({ default: m.TransactionsScreen })),
);
const RecurringScreen = lazy(() =>
  import('@/components/recurring/RecurringScreen').then((m) => ({ default: m.RecurringScreen })),
);
const CategoriesScreen = lazy(() =>
  import('./CategoriesScreen').then((m) => ({ default: m.CategoriesScreen })),
);
const AnalyticsScreen = lazy(() =>
  import('./AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen })),
);
const ProfileScreen = lazy(() =>
  import('./ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);
const SettingsScreen = lazy(() =>
  import('./SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);

export function MainApp() {
  const { activeAccount, workspaceId } = useSession();
  const { categories, loading } = useData();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('home');
  const [addOpen, setAddOpen] = useState(false);

  if (!activeAccount || !workspaceId) return null;

  const fallback = (
    <div className="flex justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-semibold">Hi, {activeAccount.name}</span>
        <button
          type="button"
          onClick={() => setTab('profile')}
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white transition-transform active:scale-95"
          style={{ backgroundImage: gradientFromHex(activeAccount.color) }}
        >
          {activeAccount.avatar ? (
            <img src={activeAccount.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            activeAccount.name.charAt(0).toUpperCase()
          )}
        </button>
      </header>

      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — changes save on this device and sync when you reconnect.
        </div>
      )}

      <main className="min-h-[calc(100dvh-3.25rem)] px-4 pb-28 pt-4">
        {loading ? (
          fallback
        ) : (
          <Suspense fallback={fallback}>
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
            {tab === 'profile' && <ProfileScreen onOpenSettings={() => setTab('settings')} />}
            {tab === 'settings' && <SettingsScreen onBack={() => setTab('profile')} />}
          </Suspense>
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
