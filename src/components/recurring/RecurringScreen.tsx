import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecurringEditorDialog } from './RecurringEditorDialog';
import { addTransaction, deleteTransaction } from '@/lib/transactions';
import { effectiveAmountCents } from '@/lib/recurring';
import { formatCents } from '@/lib/money';
import { currentMonthKey, shiftMonthKey, monthLabel } from '@/lib/date';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat } from 'lucide-react';
import type { RecurringTemplate } from '@/types';

export function RecurringScreen() {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { recurringTemplates, transactions, categories } = useData();
  const [month, setMonth] = useState(currentMonthKey());
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [adding, setAdding] = useState(false);

  const accId = activeAccount?.id ?? '';
  const myCats = useMemo(() => categories.filter((c) => c.accountId === accId), [categories, accId]);
  const catById = useMemo(() => new Map(myCats.map((c) => [c.id, c])), [myCats]);

  const mine = useMemo(
    () => recurringTemplates.filter((t) => t.accountId === accId && t.active !== false),
    [recurringTemplates, accId],
  );

  // Map templateId → transaction id for the displayed month (= "checked").
  const checkedTxn = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of transactions) {
      if (t.recurringMonth === month && t.recurringTemplateId) {
        map[t.recurringTemplateId] = t.id;
      }
    }
    return map;
  }, [transactions, month]);

  if (!activeAccount || !workspaceId) return null;
  const account = activeAccount;
  const wsId = workspaceId;

  // Per-month totals use the effective amount (any monthlyAmounts override wins
  // over the default amountCents) so the bar reflects what's actually being paid.
  const countedCents = mine.reduce(
    (sum, t) => sum + (checkedTxn[t.id] ? effectiveAmountCents(t, month) : 0),
    0,
  );
  const totalCents = mine.reduce((sum, t) => sum + effectiveAmountCents(t, month), 0);
  const checkedCount = mine.filter((t) => checkedTxn[t.id]).length;

  function toggle(t: RecurringTemplate) {
    const existing = checkedTxn[t.id];

    // Unticking never needs a category — just remove the expense.
    if (existing) {
      deleteTransaction(wsId, existing).catch((e) =>
        console.error('Recurring change will sync on reconnect:', e),
      );
      return;
    }

    // Ticking requires the bill to be filed under a real expense category.
    if (!t.categoryId) {
      setEditing(t);
      return;
    }
    const cat = catById.get(t.categoryId);
    if (!cat || cat.type !== 'expense') {
      setEditing(t);
      return;
    }
    // Offline-first: don't await — the local cache flips the checkbox instantly
    // (via the snapshot) and syncs when back online.
    addTransaction(wsId, {
      accountId: account.id,
      categoryId: t.categoryId,
      type: 'expense',
      amountCents: effectiveAmountCents(t, month),
      date: `${month}-01`,
      note: t.name,
      createdAt: Date.now(),
      createdBy: account.id,
      recurringTemplateId: t.id,
      recurringMonth: month,
    }).catch((e) => console.error('Recurring change will sync on reconnect:', e));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight">Recurring</h1>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add bill
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card px-2 py-1.5">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonthKey(m, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {mine.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground">
              Paid {checkedCount}/{mine.length}
            </span>
            <span>
              <span className="font-semibold">{formatCents(countedCents, baseCurrency)}</span>
              <span className="text-muted-foreground"> / {formatCents(totalCents, baseCurrency)}</span>
            </span>
          </CardContent>
        </Card>
      )}

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <Repeat className="h-6 w-6" />
          <p>No recurring bills yet.</p>
          <p className="px-6 text-xs">
            Add rent, subscriptions, or any monthly bill. Each month it shows up here unticked —
            tick it once you've paid and it counts as an expense.
          </p>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {mine.map((t) => {
            const checked = Boolean(checkedTxn[t.id]);
            const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
            const needsCategory = !cat || cat.type !== 'expense';
            const monthCents = effectiveAmountCents(t, month);
            const hasOverride = typeof t.monthlyAmounts?.[month] === 'number';
            return (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={checked}
                  disabled={needsCategory && !checked}
                  onCheckedChange={() => toggle(t)}
                  aria-label={`Mark ${t.name} as paid`}
                />
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={cn(
                      'block truncate text-sm font-medium',
                      checked && 'text-muted-foreground line-through',
                    )}
                  >
                    {t.name}
                  </span>
                  {needsCategory ? (
                    <span className="text-xs font-medium text-amber-600">Tap to set a category</span>
                  ) : cat ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">
                        {cat.name}
                        {t.note ? ` · ${t.note}` : ''}
                      </span>
                    </span>
                  ) : null}
                </button>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums',
                    hasOverride && 'text-primary',
                  )}
                  title={
                    hasOverride
                      ? `${monthLabel(month)} override · default ${formatCents(t.amountCents, baseCurrency)}`
                      : undefined
                  }
                >
                  {formatCents(monthCents, baseCurrency)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label={`Edit ${t.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="px-1 text-xs text-muted-foreground">
        Ticked bills are recorded as expenses for {monthLabel(month)} and appear in your balance and
        activity. Untick to remove. Tap the pencil to edit a bill — including a different amount
        just for this month.
      </p>

      <RecurringEditorDialog
        open={adding || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
          }
        }}
        workspaceId={workspaceId}
        accountId={activeAccount.id}
        baseCurrency={baseCurrency}
        categories={myCats}
        editing={editing}
        monthKey={month}
        tickedTransactionId={editing ? checkedTxn[editing.id] ?? null : null}
      />
    </div>
  );
}
