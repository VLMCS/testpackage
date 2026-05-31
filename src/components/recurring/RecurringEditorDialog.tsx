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
import { addTemplate, updateTemplate, deleteTemplate } from '@/lib/recurring';
import { parseAmountToCents } from '@/lib/money';
import type { AccountId, Category, RecurringTemplate } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';

export function RecurringEditorDialog({
  open,
  onOpenChange,
  workspaceId,
  accountId,
  baseCurrency,
  categories,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accountId: AccountId;
  baseCurrency: string;
  categories: Category[];
  editing: RecurringTemplate | null;
}) {
  // A recurring bill is filed under a real expense category.
  const selectable = categories.filter((c) => c.type === 'expense');
  const fallbackCategoryId = selectable[0]?.id ?? '';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setAmount((editing.amountCents / 100).toString());
      setNote(editing.note);
      setCategoryId(
        editing.categoryId && selectable.some((c) => c.id === editing.categoryId)
          ? editing.categoryId
          : fallbackCategoryId,
      );
    } else {
      setName('');
      setAmount('');
      setNote('');
      setCategoryId(fallbackCategoryId);
    }
    setErr(null);
    // fallbackCategoryId is derived from categories; intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function save() {
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
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await updateTemplate(workspaceId, editing.id, {
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
          categoryId: categoryId || fallbackCategoryId,
        });
      } else {
        await addTemplate(workspaceId, {
          accountId,
          name: trimmed,
          amountCents: cents,
          note: note.trim(),
          categoryId: categoryId || fallbackCategoryId,
          active: true,
          createdAt: Date.now(),
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
      await deleteTemplate(workspaceId, editing.id);
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
        </div>

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
