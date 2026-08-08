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
import { getCategoryIcon } from '@/lib/icons';
import { parseAmountToCents } from '@/lib/money';
import { currentMonthKey, monthLabel } from '@/lib/date';
import { cn } from '@/lib/utils';
import { addBudget, updateBudget, deleteBudget } from '@/lib/budgets';
import { useSession } from '@/hooks/useSession';
import type { BudgetAllocation, Category } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function BudgetEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  editing,
  expenseCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: string;
  editing: BudgetAllocation | null;
  expenseCategories: Category[];
}) {
  const { baseCurrency } = useSession();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name ?? '');
      setCategoryId(editing.categoryId ?? null);
      setAmount((editing.amountCents / 100).toString());
      setRecurring(editing.recurring ?? true);
    } else {
      setName('');
      setCategoryId(null);
      setAmount('');
      setRecurring(true);
    }
    setErr(null);
    setBusy(false);
  }, [open, editing]);

  const thisMonth = currentMonthKey();

  function save() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Give the budget a name.');
      return;
    }
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setErr('Enter a limit greater than 0.');
      return;
    }
    setErr(null);
    setBusy(true);
    // One-time budgets keep the month they were created for; recurring ones
    // clear it. Editing preserves an existing one-time budget's month.
    const monthKey = recurring ? null : editing?.monthKey ?? thisMonth;
    const payload = {
      name: trimmed,
      categoryId: categoryId ?? null,
      amountCents,
      recurring,
      monthKey,
    };
    const op = editing
      ? updateBudget(workspaceId, editing.id, payload)
      : addBudget(workspaceId, {
          accountId,
          active: true,
          createdAt: Date.now(),
          ...payload,
        });
    op.catch((e) => console.error('Budget will sync on reconnect:', e));
    onOpenChange(false);
  }

  function remove() {
    if (busy || !editing) return;
    setBusy(true);
    deleteBudget(workspaceId, editing.id).catch((e) =>
      console.error('Delete will sync on reconnect:', e),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit budget' : 'New budget'}</DialogTitle>
          <DialogDescription>
            A budget is a named spending limit. Assign expenses to it as you log them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="budget-name">Name</Label>
          <Input
            id="budget-name"
            value={name}
            onChange={(e) => {
              setErr(null);
              setName(e.target.value);
            }}
            placeholder="e.g. Groceries, Fun money, Christmas gifts"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-amount">Limit ({baseCurrency})</Label>
          <Input
            id="budget-amount"
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

        <div className="space-y-1.5">
          <Label>Repeats</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                { v: true, label: 'Every month' },
                { v: false, label: 'This month only' },
              ] as const
            ).map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setRecurring(o.v)}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium transition-colors',
                  recurring === o.v ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {!recurring && (
            <p className="text-xs text-muted-foreground">
              Applies to {monthLabel(editing?.monthKey ?? thisMonth)} only.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Category (optional)</Label>
            {categoryId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-0 text-xs"
                onClick={() => setCategoryId(null)}
              >
                Clear
              </Button>
            )}
          </div>
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expense categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {expenseCategories.map((c) => {
                const Icon = getCategoryIcon(c.icon);
                const selected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(selected ? null : c.id)}
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
          <p className="text-xs text-muted-foreground">
            Just for the icon and label — spending is tracked by the expenses you assign to this
            budget, not by category.
          </p>
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
              aria-label="Delete budget"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add budget'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
