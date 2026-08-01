import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { useSession } from '@/hooks/useSession';
import { addTransaction, updateTransaction, deleteTransaction } from '@/lib/transactions';
import { parseAmountToCents } from '@/lib/money';
import { todayIso } from '@/lib/date';
import { STORAGE_KEYS } from '@/lib/constants';
import { getCategoryIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { AccountId, Category, Transaction, Wallet } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

// Per-account key so each profile remembers its own last-used wallet.
const lastWalletKey = (accountId: AccountId) => `${STORAGE_KEYS.lastWallet}.${accountId}`;

export function AddTransactionDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  categories,
  wallets,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: AccountId;
  categories: Category[];
  wallets: Wallet[];
  editing?: Transaction | null;
}) {
  const { baseCurrency } = useSession();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [notTracked, setNotTracked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setCategoryId(editing.categoryId);
      // Keep whatever wallet the transaction had (or none for older ones).
      setWalletId(editing.walletId ?? null);
      setAmount((editing.amountCents / 100).toString());
      setDate(editing.date);
      setNote(editing.note);
      setNotTracked(Boolean(editing.notTracked));
    } else {
      setType('expense');
      setCategoryId(null);
      // Pre-select the last-used wallet for this account if it still exists,
      // otherwise the first wallet. Empty when the account has no wallets.
      const remembered = localStorage.getItem(lastWalletKey(accountId));
      const preselect =
        (remembered && wallets.some((w) => w.id === remembered) && remembered) ||
        wallets[0]?.id ||
        null;
      setWalletId(preselect);
      setAmount('');
      setDate(todayIso());
      setNote('');
      setNotTracked(false);
    }
    setErr(null);
    setBusy(false);
  }, [open, editing, accountId, wallets]);

  const options = categories.filter((c) => c.type === type);

  function changeType(next: 'expense' | 'income') {
    setType(next);
    setCategoryId((prev) => {
      const stillValid = categories.some((c) => c.id === prev && c.type === next);
      return stillValid ? prev : null;
    });
  }

  function save() {
    if (busy) return;
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      setErr('Pick a category.');
      return;
    }
    // Require a wallet only when the account actually has wallets to choose from.
    // Older/edited transactions with none stay valid (unassigned) for compat.
    if (wallets.length > 0 && !walletId) {
      setErr('Pick a wallet.');
      return;
    }
    setErr(null);
    setBusy(true);
    // Remember this wallet as the default for this account's next transaction.
    if (walletId) localStorage.setItem(lastWalletKey(accountId), walletId);
    // Offline-first: don't await the write — Firestore applies it to the local
    // cache immediately and syncs when back online (the promise stays pending
    // offline). Close right away; errors (rare) just log + retry on reconnect.
    const op = editing
      ? updateTransaction(workspaceId, editing.id, {
          type,
          categoryId,
          walletId: walletId ?? null,
          amountCents: cents,
          date,
          note: note.trim(),
          notTracked,
        })
      : addTransaction(workspaceId, {
          accountId,
          categoryId,
          walletId: walletId ?? null,
          type,
          amountCents: cents,
          date,
          note: note.trim(),
          notTracked,
          createdAt: Date.now(),
          createdBy: accountId,
        });
    op.catch((e) => console.error('Transaction will sync on reconnect:', e));
    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deleteTransaction(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={cn(
                'rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                type === t ? 'bg-background shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({baseCurrency})</Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setErr(null);
              setAmount(e.target.value);
            }}
            placeholder="0.00"
            className="text-lg"
          />
        </div>

        {wallets.length > 0 && (
          <div className="space-y-2">
            <Label>{type === 'expense' ? 'From wallet' : 'To wallet'}</Label>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <WalletChip
                  key={w.id}
                  wallet={w}
                  selected={walletId === w.id}
                  onClick={() => {
                    setErr(null);
                    setWalletId(w.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Category</Label>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {type} categories yet — add some in the Categories tab.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto pr-1">
              <CategoryGrid>
                {options.map((c) => (
                  <CategoryCard
                    key={c.id}
                    category={c}
                    selected={categoryId === c.id}
                    onClick={() => {
                      setErr(null);
                      setCategoryId(c.id);
                    }}
                  />
                ))}
              </CategoryGrid>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. lunch with friends"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="notTracked">Not tracked</Label>
            <p className="text-xs text-muted-foreground">
              Still changes your balance, but left out of Spending, Saved, and insights — for
              transfers like moving money to savings.
            </p>
          </div>
          <Switch id="notTracked" checked={notTracked} onCheckedChange={setNotTracked} />
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex items-center gap-2">
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete transaction"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editing ? (
              'Save changes'
            ) : (
              'Add transaction'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalletChip({
  wallet,
  selected,
  onClick,
}: {
  wallet: Wallet;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = getCategoryIcon(wallet.icon);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        selected ? 'border-transparent text-white' : 'bg-background text-foreground',
      )}
      style={selected ? { backgroundColor: wallet.color } : undefined}
    >
      <Icon className="h-4 w-4" style={selected ? undefined : { color: wallet.color }} />
      {wallet.name}
    </button>
  );
}
