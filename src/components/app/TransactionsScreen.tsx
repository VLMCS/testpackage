import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { TransactionList } from '@/components/transactions/TransactionList';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { ActivityCalendar, type DaySelection } from '@/components/transactions/ActivityCalendar';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { currentMonthKey, friendlyDate } from '@/lib/date';
import { runningBalancesByTxn } from '@/lib/selectors';
import { CalendarDays, ListFilter, X } from 'lucide-react';
import type { Transaction } from '@/types';

export function TransactionsScreen() {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { transactions, categories, wallets } = useData();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(currentMonthKey());
  const [selection, setSelection] = useState<DaySelection>({ start: null, end: null });
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const accId = activeAccount?.id ?? '';

  const own = useMemo(
    () => transactions.filter((t) => t.accountId === accId),
    [transactions, accId],
  );
  const myCats = useMemo(() => categories.filter((c) => c.accountId === accId), [categories, accId]);
  const myWallets = useMemo(
    () => wallets.filter((w) => w.accountId === accId && w.active),
    [wallets, accId],
  );

  // Balance after each transaction, derived from the account's full history so it
  // stays correct even when the visible list below is filtered by date/category.
  const balanceAfter = useMemo(
    () => (activeAccount ? runningBalancesByTxn(activeAccount, own) : {}),
    [activeAccount, own],
  );

  const visible = useMemo(() => {
    let list = own;
    const { start, end } = selection;
    if (start && end) list = list.filter((t) => t.date >= start && t.date <= end);
    else if (start) list = list.filter((t) => t.date === start);
    if (catFilter.size > 0) list = list.filter((t) => catFilter.has(t.categoryId));
    return list;
  }, [own, selection, catFilter]);

  if (!activeAccount || !workspaceId) return null;

  function handleSelectDay(iso: string) {
    setSelection((sel) => {
      if (!sel.start || sel.end) return { start: iso, end: null };
      if (iso <= sel.start) return { start: iso, end: null };
      return { start: sel.start, end: iso };
    });
  }

  function toggleCat(id: string) {
    setCatFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const dateLabel = selection.start
    ? selection.end
      ? `${friendlyDate(selection.start)} – ${friendlyDate(selection.end)}`
      : friendlyDate(selection.start)
    : null;

  const hasFilters = dateLabel !== null || catFilter.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight">Activity</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={catFilter.size > 0 ? 'default' : 'outline'}
            size="icon"
            onClick={() => setFilterOpen(true)}
            aria-label="Filter by category"
          >
            <ListFilter className="h-5 w-5" />
          </Button>
          <Button
            variant={calOpen ? 'default' : 'outline'}
            size="icon"
            onClick={() => setCalOpen((o) => !o)}
            aria-label="Toggle calendar"
          >
            <CalendarDays className="h-5 w-5" />
          </Button>
        </div>
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

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {dateLabel && (
            <FilterChip
              label={dateLabel}
              onClear={() => setSelection({ start: null, end: null })}
            />
          )}
          {[...catFilter].map((id) => {
            const c = myCats.find((x) => x.id === id);
            return (
              <FilterChip
                key={id}
                label={c?.name ?? 'Category'}
                color={c?.color}
                onClear={() => toggleCat(id)}
              />
            );
          })}
        </div>
      )}

      <TransactionList
        transactions={visible}
        categories={myCats}
        currency={baseCurrency}
        onSelect={setEditing}
        balanceAfter={balanceAfter}
        emptyLabel={hasFilters ? 'Nothing matches these filters.' : 'No transactions yet — tap + to add one.'}
      />

      <AddTransactionDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        workspaceId={workspaceId}
        accountId={editing?.accountId ?? activeAccount.id}
        categories={myCats}
        wallets={myWallets}
        editing={editing}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter by category</DialogTitle>
            <DialogDescription>
              Tap categories to show only those. None selected shows everything.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <CategoryGrid>
              {myCats
                .filter((c) => c.type !== 'recurring')
                .map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  selected={catFilter.has(c.id)}
                  onClick={() => toggleCat(c.id)}
                />
              ))}
            </CategoryGrid>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setCatFilter(new Set())}>
              Clear
            </Button>
            <Button className="flex-1" onClick={() => setFilterOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  label,
  color,
  onClear,
}: {
  label: string;
  color?: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs"
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      <span className="font-medium">{label}</span>
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
