import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCategoryIcon } from '@/lib/icons';
import { parseAmountToCents } from '@/lib/money';
import { projectInterest, FREQUENCY_LABEL } from '@/lib/interest';
import { todayIso } from '@/lib/date';
import { addTransaction } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import type { Category, Wallet } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * Pick the income category interest should file under by default: prefer one
 * named like "Investment"/"Interest", then "Income", then the first income
 * category. Returns null when the account has no income categories at all.
 */
function defaultIncomeCategory(categories: Category[]): Category | null {
  const income = categories.filter((c) => c.type === 'income');
  if (income.length === 0) return null;
  const byName = (needle: string) =>
    income.find((c) => c.name.toLowerCase().includes(needle));
  return byName('interest') ?? byName('investment') ?? byName('income') ?? income[0];
}

export function LogInterestDialog({
  open,
  onOpenChange,
  workspaceId,
  wallet,
  balanceCents,
  incomeCategories,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  wallet: Wallet | null;
  balanceCents: number;
  incomeCategories: Category[];
  baseCurrency: string;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const projection = useMemo(
    () => (wallet?.interest ? projectInterest(balanceCents, wallet.interest) : null),
    [wallet, balanceCents],
  );

  useEffect(() => {
    if (!open || !wallet) return;
    setAmount(projection ? (projection.perPeriodCents / 100).toString() : '');
    setDate(todayIso());
    setCategoryId(defaultIncomeCategory(incomeCategories)?.id ?? null);
    setErr(null);
    setBusy(false);
  }, [open, wallet, incomeCategories, projection]);

  if (!wallet || !wallet.interest) return null;
  const freqLabel = FREQUENCY_LABEL[wallet.interest.frequency];

  function save() {
    if (busy || !wallet) return;
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      setErr('Pick a category (add an income category first if there are none).');
      return;
    }
    setErr(null);
    setBusy(true);
    // Interest is real income that lands in this wallet — a normal (tracked)
    // income transaction so it grows the wallet balance and counts as income.
    addTransaction(workspaceId, {
      accountId: wallet.accountId,
      categoryId,
      walletId: wallet.id,
      type: 'income',
      amountCents: cents,
      date,
      note: `Interest (${freqLabel})`,
      notTracked: false,
      createdAt: Date.now(),
      createdBy: wallet.accountId,
    }).catch((e) => console.error('Interest log will sync on reconnect:', e));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log interest — {wallet.name}</DialogTitle>
          <DialogDescription>
            Records one {freqLabel}'s interest as income in this wallet. The amount is estimated
            from the current balance — adjust it to match what your bank actually credited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="interest-amount">Amount ({baseCurrency})</Label>
          <Input
            id="interest-amount"
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

        <div className="space-y-2">
          <Label htmlFor="interest-date">Date</Label>
          <Input
            id="interest-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No income categories yet — add one in the Categories tab first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {incomeCategories.map((c) => {
                const Icon = getCategoryIcon(c.icon);
                const selected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setErr(null);
                      setCategoryId(c.id);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      selected ? 'border-transparent text-white' : 'bg-background text-foreground',
                    )}
                    style={selected ? { backgroundColor: c.color } : undefined}
                  >
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                    ) : (
                      <Icon className="h-4 w-4" style={selected ? undefined : { color: c.color }} />
                    )}
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log interest'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
