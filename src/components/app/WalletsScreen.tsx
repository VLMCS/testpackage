import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { WalletEditorDialog } from '@/components/wallets/WalletEditorDialog';
import { TransferDialog } from '@/components/wallets/TransferDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletBalanceCents, unassignedBalanceCents } from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { gradientFromHex } from '@/lib/theme';
import { friendlyDate } from '@/lib/date';
import { ArrowRight, ChevronLeft, Plus, ArrowLeftRight } from 'lucide-react';
import type { Transfer, Wallet } from '@/types';

export function WalletsScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { wallets, transactions, transfers } = useData();
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [adding, setAdding] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);

  const accId = activeAccount?.id ?? '';
  const mine = useMemo(() => wallets.filter((w) => w.accountId === accId), [wallets, accId]);
  const myTransfers = useMemo(
    () => transfers.filter((t) => t.accountId === accId),
    [transfers, accId],
  );
  const unassigned = useMemo(
    () => (activeAccount ? unassignedBalanceCents(activeAccount, transactions, transfers) : 0),
    [activeAccount, transactions, transfers],
  );
  const total = useMemo(
    () =>
      unassigned +
      mine.reduce((sum, w) => sum + walletBalanceCents(w, transactions, transfers), 0),
    [unassigned, mine, transactions, transfers],
  );

  if (!activeAccount || !workspaceId) return null;

  const walletEditorOpen = editing !== null || adding;
  const nameFor = (id: string | null) =>
    id === null ? 'Unassigned' : (mine.find((w) => w.id === id)?.name ?? 'Deleted wallet');

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

      <Button variant="outline" className="w-full" onClick={() => setTransferOpen(true)}>
        <ArrowLeftRight className="h-4 w-4" /> Move money
      </Button>

      <div className="space-y-2">
        {/* Unassigned bucket — the account's money not yet in a named wallet. */}
        <div className="flex w-full items-center gap-3 rounded-xl border border-dashed bg-card p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Unassigned</span>
            <span className="block text-xs text-muted-foreground">Not in a wallet yet</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatCents(unassigned, baseCurrency)}
          </span>
        </div>

        {mine.map((w) => {
          const Icon = getCategoryIcon(w.icon);
          const bal = walletBalanceCents(w, transactions, transfers);
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

      {myTransfers.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-sm font-medium text-muted-foreground">Recent transfers</p>
          <div className="space-y-2">
            {myTransfers.slice(0, 15).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setEditingTransfer(t);
                  setTransferOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl border bg-card p-3 text-left text-sm shadow-sm transition-colors hover:bg-accent"
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate font-medium">{nameFor(t.fromWalletId)}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{nameFor(t.toWalletId)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">
                    {formatCents(t.amountCents, baseCurrency)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{friendlyDate(t.date)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="px-1 text-xs text-muted-foreground">
        Each wallet's balance is its starting amount, the transactions assigned to it, and any
        transfers in or out. Use "Move money" to shift funds — for example, out of Unassigned into a
        wallet.
      </p>

      <WalletEditorDialog
        open={walletEditorOpen}
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

      <TransferDialog
        open={transferOpen}
        onOpenChange={(o) => {
          setTransferOpen(o);
          if (!o) setEditingTransfer(null);
        }}
        workspaceId={workspaceId}
        accountId={accId}
        wallets={mine.filter((w) => w.active)}
        editing={editingTransfer}
      />
    </div>
  );
}
