import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Dashboard } from './Dashboard';
import { BottomNav, type Tab } from './BottomNav';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gradientFromHex } from '@/lib/theme';
import { migrateCategoriesPerAccount, dedupeCategories, seedDefaultWallets } from '@/lib/migrate';
import { Check, Loader2, WifiOff } from 'lucide-react';

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
const WalletsScreen = lazy(() =>
  import('./WalletsScreen').then((m) => ({ default: m.WalletsScreen })),
);

export function MainApp() {
  const { activeAccount, accounts, workspaceId } = useSession();
  const { categories, transactions, recurringTemplates, wallets, loading, pendingWrites } =
    useData();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('home');
  const [addOpen, setAddOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  // Mirror nav state into refs so the mount-once back-handler reads fresh values.
  const tabRef = useRef(tab);
  const addOpenRef = useRef(addOpen);
  const exitOpenRef = useRef(exitOpen);
  const exitingRef = useRef(false);
  tabRef.current = tab;
  addOpenRef.current = addOpen;
  exitOpenRef.current = exitOpen;

  // Android hardware back button → handled in-app instead of closing the PWA.
  // We keep exactly one "guard" history entry on top; each back press consumes it
  // (popstate), we act on the current screen, then re-arm the guard.
  useEffect(() => {
    window.history.pushState({ clerune: true }, '');
    const onPop = () => {
      if (exitingRef.current) {
        // Exit confirmed — let the navigation proceed (closes the installed PWA).
        window.history.back();
        return;
      }
      window.history.pushState({ clerune: true }, ''); // re-arm
      if (exitOpenRef.current) {
        setExitOpen(false); // back while the exit prompt is up = cancel
      } else if (addOpenRef.current) {
        setAddOpen(false); // back closes the add sheet
      } else if (tabRef.current !== 'home') {
        setTab('home'); // back returns to the dashboard
      } else {
        setExitOpen(true); // back on home asks to exit
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function confirmExit() {
    exitingRef.current = true;
    setExitOpen(false);
    window.history.back();
  }

  // One-time migration: give each account its own copy of the old shared
  // categories (no-ops once the workspace is on schemaVersion 2).
  const migratedRef = useRef(false);
  useEffect(() => {
    if (loading || migratedRef.current || !workspaceId || accounts.length === 0) return;
    migratedRef.current = true;
    void (async () => {
      // v2: per-account category copies. v3: merge exact duplicates.
      // v4: seed default wallets for pre-existing accounts.
      await migrateCategoriesPerAccount(
        workspaceId,
        accounts,
        categories,
        transactions,
        recurringTemplates,
      );
      await dedupeCategories(workspaceId, categories, transactions, recurringTemplates);
      await seedDefaultWallets(workspaceId, accounts, wallets);
    })().catch(() => {
      migratedRef.current = false; // allow a retry next render if it failed
    });
  }, [loading, workspaceId, accounts, categories, transactions, recurringTemplates, wallets]);

  if (!activeAccount || !workspaceId) return null;

  const myCategories = categories.filter((c) => c.accountId === activeAccount.id);
  const myWallets = wallets.filter((w) => w.accountId === activeAccount.id && w.active);

  const fallback = (
    <div className="flex justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 pb-2.5 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
      >
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">
            Hi, {activeAccount.name}
          </span>
          <SyncStatus online={online} pending={pendingWrites} />
        </div>
        <button
          type="button"
          onClick={() => setTab('profile')}
          aria-label="Profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white transition-transform active:scale-95"
          style={{ backgroundImage: gradientFromHex(activeAccount.color) }}
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
          fallback
        ) : (
          <Suspense fallback={fallback}>
            {tab === 'home' && (
              <Dashboard
                onViewAll={() => setTab('activity')}
                onInsights={() => setTab('analytics')}
                onOpenWallets={() => setTab('wallets')}
              />
            )}
            {tab === 'activity' && <TransactionsScreen />}
            {tab === 'recurring' && <RecurringScreen />}
            {tab === 'categories' && <CategoriesScreen />}
            {tab === 'analytics' && <AnalyticsScreen onBack={() => setTab('home')} />}
            {tab === 'profile' && (
              <ProfileScreen
                onOpenSettings={() => setTab('settings')}
                onOpenWallets={() => setTab('wallets')}
              />
            )}
            {tab === 'settings' && <SettingsScreen onBack={() => setTab('profile')} />}
            {tab === 'wallets' && <WalletsScreen onBack={() => setTab('profile')} />}
          </Suspense>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} onAdd={() => setAddOpen(true)} />

      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={workspaceId}
        accountId={activeAccount.id}
        categories={myCategories}
        wallets={myWallets}
      />

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Exit Clerune Tracker?</DialogTitle>
            <DialogDescription>You can reopen it anytime from your home screen.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setExitOpen(false)}>
              Stay
            </Button>
            <Button variant="destructive" className="flex-1" onClick={confirmExit}>
              Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SyncStatus({ online, pending }: { online: boolean; pending: boolean }) {
  if (!online) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
        <WifiOff className="h-3 w-3" /> Offline — saved on device
      </span>
    );
  }
  if (pending) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
      <Check className="h-3 w-3" /> All changes saved
    </span>
  );
}
