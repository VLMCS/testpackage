import { EyeOff, Wallet } from 'lucide-react';
import { friendlyDate } from '@/lib/date';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { isLightColor } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Category, Transaction } from '@/types';

export function TransactionList({
  transactions,
  categories,
  currency,
  onSelect,
  ownerColors,
  balanceAfter,
  emptyLabel = 'No transactions yet.',
}: {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onSelect?: (t: Transaction) => void;
  ownerColors?: Record<string, string>;
  // Optional map of transaction id → account balance right after that transaction.
  // When provided, each row shows the resulting balance beneath its amount.
  balanceAfter?: Record<string, number>;
  emptyLabel?: string;
}) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const t of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.date} className="space-y-1.5">
          <p className="px-1 text-xs font-medium text-muted-foreground">{friendlyDate(g.date)}</p>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {g.items.map((t) => {
              const cat = catMap.get(t.categoryId);
              const Icon = getCategoryIcon(cat?.icon ?? 'Tag');
              const bg = cat?.color ?? '#64748b';
              const darkGlyph = isLightColor(bg);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect?.(t)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    style={{ backgroundColor: bg }}
                  >
                    {cat?.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className={cn('h-5 w-5', darkGlyph ? 'text-slate-900' : 'text-white')} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {cat?.name ?? 'Uncategorized'}
                      </span>
                      {t.notTracked && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <EyeOff className="h-3 w-3" />
                          Not tracked
                        </span>
                      )}
                    </span>
                    {t.note && (
                      <span className="block truncate text-xs text-muted-foreground">{t.note}</span>
                    )}
                  </span>
                  {ownerColors && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ownerColors[t.accountId] }}
                    />
                  )}
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        t.type === 'income' ? 'text-emerald-600' : 'text-foreground',
                      )}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatCents(t.amountCents, currency)}
                    </span>
                    {balanceAfter && balanceAfter[t.id] !== undefined && (
                      <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                        <Wallet className="h-3 w-3" />
                        {formatCents(balanceAfter[t.id], currency)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
