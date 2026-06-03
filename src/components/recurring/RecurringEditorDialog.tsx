import { useEffect, useState } from 'react';
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
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { addTemplate, updateTemplate, deleteTemplate, setMonthlyAmount } from '@/lib/recurring';
import { updateTransaction } from '@/lib/transactions';
import { parseAmountToCents } from '@/lib/money';
import { monthLabel } from '@/lib/date';
import type { AccountId, Category, RecurringTemplate } from '@/types';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';

export function RecurringEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  baseCurrency,
  categories,
  editing,
  monthKey,
  tickedTransactionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: AccountId;
  baseCurrency: string;
  categories: Category[];
  editing: RecurringTemplate | null;
  /** Month currently viewed on the Recurring screen — used for the per-month override. */
  monthKey: string;
  /** Id of the transaction created when this bill was ticked for monthKey (if any). */
  tickedTransactionId: string | null;
}) {
  // A recurring bill is filed under a real expense category.
  const selectable = categories.filter((c) => c.type === 'expense');
  const fallbackCategoryId = selectable[0]?.id ?? '';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [monthAmount, setMonthAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // True iff this template currently has an explicit override for monthKey.
  const hasOverride =
    !!editing && typeof editing.monthlyAmounts?.[monthKey] === 'number';

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setAmount((editing.amountCents / 100).toString());
      const override = editing.monthlyAmounts?.[monthKey];
      setMonthAmount(typeof override === 'number' ? (override / 100).toString() : '');
      setNote(editing.note);
      setCategoryId(
        editing.categoryId && selectable.some((c) => c.id === editing.categoryId)
          ? editing.categoryId
          : fallbackCategoryId,
      );
    } else {
      setName('');
      setAmount('');
      setMonthAmount('');
      setNote('');
      setCategoryId(fallbackCategoryId);
    }
    setErr(null);
    setBusy(false);
    // fallbackCategoryId is derived from categories; intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, monthKey]);

  function save() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give the bill a name.');
      return;
    }
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setErr('Enter an amount greater than 0.');
      return;
    }
    if (!categoryId || !selectable.some((c) => c.id === categoryId)) {
      setErr('Pick a category for this bill.');
      return;
    }
    // Parse the per-month override. Empty means "no override" (use default).
    // A value equal to the default also collapses to "no override" so we don't
    // store redundant data. undefined means we don't touch monthlyAmounts at all.
    let overrideCents: number | null | undefined;
    if (editing) {
      const monthInput = monthAmount.trim();
      if (monthInput === '') {
        overrideCents = hasOverride ? null : undefined;
      } else {
        const parsed = parseAmountToCents(monthAmount);
        if (parsed === null || parsed <= 0) {
          setErr(`Enter a "Just ${monthLabel(monthKey)}" amount greater than 0, or leave it empty.`);
          return;
        }
        if (parsed === cents) {
          overrideCents = hasOverride ? null : undefined;
        } else {
          overrideCents = parsed;
        }
      }
    }
    setErr(null);
    setBusy(true);
    // Offline-first: issue the write without awaiting (see AddTransactionDialog).
    const op = editing
      ? updateTemplate(workspaceId, editing.id, {
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
          categoryId: categoryId || fallbackCategoryId,
        })
      : addTemplate(workspaceId, {
          accountId,
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
          categoryId: categoryId || fallbackCategoryId,
          active: true,
          createdAt: Date.now(),
        });
    op.catch((e) => console.error('Recurring bill will sync on reconnect:', e));

    if (editing && overrideCents !== undefined) {
      setMonthlyAmount(workspaceId, editing.id, monthKey, overrideCents).catch((e) =>
        console.error('Monthly amount will sync on reconnect:', e),
      );
    }

    // Keep the already-ticked transaction (if any) in sync with whatever this
    // month's effective amount becomes after the save.
    if (editing && tickedTransactionId) {
      const finalMonthCents =
        overrideCents !== undefined && overrideCents !== null ? overrideCents : cents;
      updateTransaction(workspaceId, tickedTransactionId, {
        amountCents: finalMonthCents,
      }).catch((e) => console.error('Transaction amount will sync on reconnect:', e));
    }

    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deleteTemplate(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit recurring bill' : 'New recurring bill'}</DialogTitle>
          <DialogDescription>
            It reappears every month as an unchecked item. Tick it the month you pay it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rec-name">Name</Label>
          <Input
            id="rec-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Electricity, Netflix"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rec-amount">Amount ({baseCurrency})</Label>
          <Input
            id="rec-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">Default used every month.</p>
        </div>

        {editing && (
          <div className="space-y-2">
            <Label htmlFor="rec-month-amount">Just {monthLabel(monthKey)} (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rec-month-amount"
                inputMode="decimal"
                value={monthAmount}
                onChange={(e) => setMonthAmount(e.target.value)}
                placeholder="Leave empty to use the default"
              />
              {hasOverride && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMonthAmount('')}
                  aria-label={`Reset ${monthLabel(monthKey)} to the default amount`}
                  title="Clear override"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use a different amount for {monthLabel(monthKey)} only. Other months stay at the
              default above.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Category</Label>
          <p className="text-xs text-muted-foreground">
            When ticked, this bill is recorded under this category (so it shows in that category's
            spending and analytics).
          </p>
          {selectable.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              You have no expense categories yet. Add one in the Categories tab first.
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto pr-1">
              <CategoryGrid>
                {selectable.map((c) => (
                  <CategoryCard
                    key={c.id}
                    category={c}
                    selected={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                  />
                ))}
              </CategoryGrid>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rec-note">Note (optional)</Label>
          <Input
            id="rec-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. due on the 5th"
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
              aria-label="Delete recurring bill"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy || selectable.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add bill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
