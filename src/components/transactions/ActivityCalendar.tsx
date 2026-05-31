import { useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonthKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

export interface DaySelection {
  start: string | null;
  end: string | null;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ActivityCalendar({
  monthKey,
  onMonthChange,
  transactions,
  selection,
  onSelectDay,
}: {
  monthKey: string;
  onMonthChange: (key: string) => void;
  transactions: Transaction[];
  selection: DaySelection;
  onSelectDay: (dayIso: string) => void;
}) {
  const first = parse(monthKey, 'yyyy-MM', new Date());
  const days = eachDayOfInterval({ start: startOfMonth(first), end: endOfMonth(first) });
  const leadingBlanks = getDay(startOfMonth(first));

  const netByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.slice(0, 7) !== monthKey) continue;
      map[t.date] = (map[t.date] ?? 0) + (t.type === 'income' ? t.amountCents : -t.amountCents);
    }
    return map;
  }, [transactions, monthKey]);

  function stateFor(iso: string): 'none' | 'single' | 'start' | 'end' | 'mid' {
    const { start, end } = selection;
    if (!start) return 'none';
    if (!end) return iso === start ? 'single' : 'none';
    if (iso === start && iso === end) return 'single';
    if (iso === start) return 'start';
    if (iso === end) return 'end';
    if (iso > start && iso < end) return 'mid';
    return 'none';
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(first, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-[10px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const net = netByDay[iso];
          const sel = stateFor(iso);
          const highlighted = sel === 'single' || sel === 'start' || sel === 'end';
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={cn(
                'relative flex h-9 items-center justify-center rounded-md text-xs transition-colors',
                sel === 'none' && 'hover:bg-accent',
                sel === 'mid' && 'bg-primary/15',
                highlighted && 'bg-primary font-semibold text-primary-foreground',
              )}
            >
              {d.getDate()}
              {net !== undefined && net !== 0 && (
                <span
                  className={cn(
                    'absolute bottom-1 h-1 w-1 rounded-full',
                    highlighted
                      ? 'bg-primary-foreground'
                      : net > 0
                        ? 'bg-emerald-500'
                        : 'bg-rose-500',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
