import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { BudgetEditorDialog } from '@/components/budgets/BudgetEditorDialog';
import { Button } from '@/components/ui/button';
import { budgetSpentCents, budgetProgress, budgetAppliesToMonth } from '@/lib/selectors';
import { currentMonthKey, monthLabel } from '@/lib/date';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { ChevronLeft, Plus, Wallet as WalletIcon } from 'lucide-react';
import type { BudgetAllocation } from '@/types';

export function BudgetsScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { budgets, categories, transactions } = useData();
  const [editing, setEditing] = useState<BudgetAllocation | null>(null);
  const [adding, setAdding] = useState(false);

  const accId = activeAccount?.id ?? '';
  const month = currentMonthKey();

  const mine = useMemo(() => budgets.filter((b) => b.accountId === accId), [budgets, accId]);
  const catById = useMemo(
    () => new Map(categories.filter((c) => c.accountId === accId).map((c) => [c.id, c])),
    [categories, accId],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.accountId === accId && c.type === 'expense'),
    [categories, accId],
  );

  if (!activeAccount || !workspaceId) return null;

  const open = editing !== null || adding;
  // The month a budget's spending is measured in: this month for recurring, its
  // own month for one-time budgets.
  const budgetMonth = (b: BudgetAllocation) => (b.recurring ? month : b.monthKey ?? month);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 px-1">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Budgets</h1>
      </div>

      <div className="space-y-3">
        {mine.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            No budgets yet. Create a named limit like "Groceries" or "Fun money", then assign
            expenses to it as you log them.
          </p>
        )}

        {mine.map((b) => {
          const cat = b.categoryId ? catById.get(b.categoryId) : undefined;
          const bMonth = budgetMonth(b);
          const spent = budgetSpentCents(transactions, b.id, bMonth);
          const p = budgetProgress(b.amountCents, spent);
          const Icon = cat ? getCategoryIcon(cat.icon) : WalletIcon;
          const tint = cat?.color ?? '#64748b';
          const barColor = p.over ? '#dc2626' : tint;
          const applies = budgetAppliesToMonth(b, month);
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
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {b.recurring ? 'Every month' : `${monthLabel(bMonth)} only`}
                    {cat ? ` · ${cat.name}` : ''}
                  </span>
                </span>
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
                    {formatCents(-p.remainingCents, baseCurrency)} over
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {formatCents(p.remainingCents, baseCurrency)} left
                  </span>
                )}
                {!applies && <span className="text-muted-foreground"> · not active this month</span>}
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
        A budget's spending is the expenses you assign to it (choose a budget when adding an
        expense). Recurring budgets reset every month.
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
        expenseCategories={expenseCategories}
      />
    </div>
  );
}
