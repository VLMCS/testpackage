import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { WalletEditorDialog } from '@/components/wallets/WalletEditorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletBalanceCents } from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex } from '@/lib/theme';
import { ChevronLeft, Plus } from 'lucide-react';
import type { Wallet } from '@/types';

export function WalletsScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { wallets, transactions } = useData();
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [adding, setAdding] = useState(false);

  const accId = activeAccount?.id ?? '';
  const mine = useMemo(
    () => wallets.filter((w) => w.accountId === accId),
    [wallets, accId],
  );
  const total = useMemo(
    () => mine.reduce((sum, w) => sum + walletBalanceCents(w, transactions), 0),
    [mine, transactions],
  );

  if (!activeAccount || !workspaceId) return null;

  const open = editing !== null || adding;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 px-1">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Wallets</h1>
      </div>

      <Card className="bg-accent-gradient border-0 text-primary-foreground">
        <CardContent className="py-4">
          <p className="text-xs opacity-80">Across all wallets</p>
          <p className="text-2xl font-bold tracking-tight">{formatCents(total, baseCurrency)}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {mine.map((w) => {
          const Icon = getCategoryIcon(w.icon);
          const bal = walletBalanceCents(w, transactions);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setEditing(w)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundImage: gradientFromHex(w.color) }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 font-medium">{w.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatCents(bal, baseCurrency)}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Add wallet</span>
        </button>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Each wallet's balance is its starting amount plus the transactions assigned to it. When you
        add a transaction, pick which wallet it comes from.
      </p>

      <WalletEditorDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setAdding(false);
          }
        }}
        workspaceId={workspaceId}
        accountId={accId}
        editing={editing}
      />
    </div>
  );
}
