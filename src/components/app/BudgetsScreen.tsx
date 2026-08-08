import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { BudgetEditorDialog } from '@/components/budgets/BudgetEditorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { spendingByCategory, budgetProgress } from '@/lib/selectors';
import { currentMonthKey, monthLabel } from '@/lib/date';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { ChevronLeft, Plus } from 'lucide-react';
import type { BudgetAllocation } from '@/types';

export function BudgetsScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { budgets, categories, transactions } = useData();
  const [editing, setEditing] = useState<BudgetAllocation | null>(null);
  const [adding, setAdding] = useState(false);

  const accId = activeAccount?.id ?? '';
  const month = currentMonthKey();

  const mine = useMemo(() => budgets.filter((b) => b.accountId === accId), [budgets, accId]);
  const myCategories = useMemo(
    () => categories.filter((c) => c.accountId === accId),
    [categories, accId],
  );
  const catById = useMemo(() => new Map(myCategories.map((c) => [c.id, c])), [myCategories]);
  const spendMap = useMemo(
    () => spendingByCategory(transactions, accId, month),
    [transactions, accId, month],
  );

  // Only expense categories, and (for a new budget) those not already budgeted.
  const budgetedIds = new Set(mine.map((b) => b.categoryId));
  const availableCategories = myCategories.filter(
    (c) => c.type === 'expense' && (!budgetedIds.has(c.id) || c.id === editing?.categoryId),
  );

  const totals = useMemo(() => {
    let limit = 0;
    let spent = 0;
    for (const b of mine) {
      limit += b.amountCents;
      spent += spendMap[b.categoryId] ?? 0;
    }
    return { limit, spent };
  }, [mine, spendMap]);

  if (!activeAccount || !workspaceId) return null;

  const open = editing !== null || adding;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 px-1">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Budgets</h1>
      </div>

      {mine.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{monthLabel(month)} · spent of budget</p>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {formatCents(totals.spent, baseCurrency)}{' '}
              <span className="text-base font-medium text-muted-foreground">
                / {formatCents(totals.limit, baseCurrency)}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {mine.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            No budgets yet. Set a monthly limit on a category like Food / Drinks to keep spending in
            check.
          </p>
        )}

        {mine.map((b) => {
          const cat = catById.get(b.categoryId);
          if (!cat) return null; // category was deleted — skip
          const spent = spendMap[b.categoryId] ?? 0;
          const p = budgetProgress(b.amountCents, spent);
          const Icon = getCategoryIcon(cat.icon);
          const barColor = p.over ? '#dc2626' : cat.color;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setEditing(b)}
              className="block w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 font-medium">{cat.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {formatCents(spent, baseCurrency)} / {formatCents(b.amountCents, baseCurrency)}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(p.ratio * 100)}%`, backgroundColor: barColor }}
                />
              </div>

              <p className="mt-1.5 text-xs">
                {p.over ? (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    {formatCents(-p.remainingCents, baseCurrency)} over budget
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {formatCents(p.remainingCents, baseCurrency)} left this month
                  </span>
                )}
              </p>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Add budget</span>
        </button>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Spending counts each category's tracked expenses this month. Not-tracked transactions are
        excluded.
      </p>

      <BudgetEditorDialog
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
        availableCategories={availableCategories}
      />
    </div>
  );
}
