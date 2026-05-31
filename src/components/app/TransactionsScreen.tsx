import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { TransactionList } from '@/components/transactions/TransactionList';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { ActivityCalendar, type DaySelection } from '@/components/transactions/ActivityCalendar';
import { Button } from '@/components/ui/button';
import { currentMonthKey, friendlyDate } from '@/lib/date';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

export function TransactionsScreen() {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { transactions, categories } = useData();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(currentMonthKey());
  const [selection, setSelection] = useState<DaySelection>({ start: null, end: null });

  const accId = activeAccount?.id ?? '';

  // Only ever this profile's own transactions.
  const own = useMemo(
    () => transactions.filter((t) => t.accountId === accId),
    [transactions, accId],
  );

  const visible = useMemo(() => {
    const { start, end } = selection;
    if (start && end) return own.filter((t) => t.date >= start && t.date <= end);
    if (start) return own.filter((t) => t.date === start);
    return own;
  }, [own, selection]);

  if (!activeAccount || !workspaceId) return null;

  function handleSelectDay(iso: string) {
    setSelection((sel) => {
      if (!sel.start || sel.end) return { start: iso, end: null }; // begin a new selection
      if (iso <= sel.start) return { start: iso, end: null }; // restart at/before current start
      return { start: sel.start, end: iso }; // complete the range
    });
  }

  function clearSelection() {
    setSelection({ start: null, end: null });
  }

  const filterLabel = selection.start
    ? selection.end
      ? `${friendlyDate(selection.start)} – ${friendlyDate(selection.end)}`
      : friendlyDate(selection.start)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight">Activity</h1>
        <Button
          variant={calOpen ? 'default' : 'outline'}
          size="icon"
          onClick={() => setCalOpen((o) => !o)}
          aria-label="Toggle calendar"
        >
          <CalendarDays className="h-5 w-5" />
        </Button>
      </div>

      {calOpen && (
        <ActivityCalendar
          monthKey={calMonth}
          onMonthChange={setCalMonth}
          transactions={own}
          selection={selection}
          onSelectDay={handleSelectDay}
        />
      )}

      {filterLabel && (
        <button
          type="button"
          onClick={clearSelection}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-sm',
          )}
        >
          <span>
            Showing <span className="font-medium">{filterLabel}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            Clear <X className="h-4 w-4" />
          </span>
        </button>
      )}

      <TransactionList
        transactions={visible}
        categories={categories}
        currency={baseCurrency}
        onSelect={setEditing}
        emptyLabel={
          filterLabel ? 'Nothing in this range.' : 'No transactions yet — tap + to add one.'
        }
      />

      <AddTransactionDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        workspaceId={workspaceId}
        accountId={editing?.accountId ?? activeAccount.id}
        categories={categories}
        editing={editing}
      />
    </div>
  );
}
