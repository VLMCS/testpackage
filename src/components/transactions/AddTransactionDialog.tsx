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
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { useSession } from '@/hooks/useSession';
import { addTransaction, updateTransaction, deleteTransaction } from '@/lib/transactions';
import { parseAmountToCents } from '@/lib/money';
import { todayIso } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { AccountId, Category, Transaction } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function AddTransactionDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  categories,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: AccountId;
  categories: Category[];
  editing?: Transaction | null;
}) {
  const { baseCurrency } = useSession();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setCategoryId(editing.categoryId);
      setAmount((editing.amountCents / 100).toString());
      setDate(editing.date);
      setNote(editing.note);
    } else {
      setType('expense');
      setCategoryId(null);
      setAmount('');
      setDate(todayIso());
      setNote('');
    }
    setErr(null);
    setBusy(false);
  }, [open, editing]);

  const options = categories.filter((c) => c.type === type);

  function changeType(next: 'expense' | 'income') {
    setType(next);
    setCategoryId((prev) => {
      const stillValid = categories.some((c) => c.id === prev && c.type === next);
      return stillValid ? prev : null;
    });
  }

  async function save() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      setErr('Pick a category.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await updateTransaction(workspaceId, editing.id, {
          type,
          categoryId,
          amountCents: cents,
          date,
          note: note.trim(),
        });
      } else {
        await addTransaction(workspaceId, {
          accountId,
          categoryId,
          type,
          amountCents: cents,
          date,
          note: note.trim(),
          createdAt: Date.now(),
          createdBy: accountId,
        });
      }
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await deleteTransaction(workspaceId, editing.id);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
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
