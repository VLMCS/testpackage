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
  // Expense categories that don't already have a budget (plus the one being
  // edited), so the user can't create two budgets for the same category.
  availableCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: string;
  editing: BudgetAllocation | null;
  availableCategories: Category[];
}) {
  const { baseCurrency } = useSession();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategoryId(editing.categoryId);
      setAmount((editing.amountCents / 100).toString());
    } else {
      setCategoryId(null);
      setAmount('');
    }
    setErr(null);
    setBusy(false);
  }, [open, editing]);

  function save() {
    if (busy) return;
    if (!categoryId) {
      setErr('Pick a category to budget.');
      return;
    }
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setErr('Enter a monthly limit greater than 0.');
      return;
    }
    setErr(null);
    setBusy(true);
    const op = editing
      ? updateBudget(workspaceId, editing.id, { categoryId, amountCents })
      : addBudget(workspaceId, {
          accountId,
          categoryId,
          amountCents,
          active: true,
          createdAt: Date.now(),
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit budget' : 'New budget'}</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category. Progress resets each month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Category</Label>
          {availableCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every expense category already has a budget. Edit an existing one instead.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((c) => {
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

        <div className="space-y-2">
          <Label htmlFor="budget-amount">Monthly limit ({baseCurrency})</Label>
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
