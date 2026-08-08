import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { ProfileEditorDialog } from '@/components/profile/ProfileEditorDialog';
import { AdminModeDialog } from '@/components/profile/AdminModeDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { netWorthCents } from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { gradientFromHex } from '@/lib/theme';
import { ChevronRight, Cog, Pencil, RefreshCw, Settings, Target, Wallet } from 'lucide-react';

export function ProfileScreen({
  onOpenSettings,
  onOpenWallets,
  onOpenPlans,
}: {
  onOpenSettings: () => void;
  onOpenWallets: () => void;
  onOpenPlans: () => void;
}) {
  const { activeAccount, baseCurrency, workspaceId, lock } = useSession();
  const { transactions, wallets, transfers, financePlans } = useData();
  const [editing, setEditing] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  if (!activeAccount || !workspaceId) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Admin mode"
          title="Admin mode"
          onClick={() => setAdminOpen(true)}
        >
          <Cog className="h-5 w-5" />
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-semibold text-white"
            style={{ backgroundImage: gradientFromHex(activeAccount.color) }}
          >
            {activeAccount.avatar ? (
              <img src={activeAccount.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              activeAccount.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{activeAccount.name}</p>
            <p className="text-sm text-muted-foreground">
              Net worth{' '}
              {formatCents(netWorthCents(activeAccount, wallets, transactions, transfers), baseCurrency)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={onOpenWallets}
        className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Wallets</span>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {wallets.filter((w) => w.accountId === activeAccount.id).length}
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenPlans}
        className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-3">
          <Target className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Finance Plans</span>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {financePlans.filter((p) => p.accountId === activeAccount.id).length}
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Settings</span>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {baseCurrency}
          <ChevronRight className="h-5 w-5" />
        </span>
      </button>

      <Button variant="outline" className="w-full" onClick={lock}>
        <RefreshCw className="h-4 w-4" /> Switch profile
      </Button>

      <ProfileEditorDialog
        open={editing}
        onOpenChange={setEditing}
        workspaceId={workspaceId}
        account={activeAccount}
      />

      <AdminModeDialog open={adminOpen} onOpenChange={setAdminOpen} />
    </div>
  );
}
