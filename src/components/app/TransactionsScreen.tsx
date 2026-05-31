import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { TransactionList } from '@/components/transactions/TransactionList';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

type Filter = 'mine' | 'partner' | 'both';

export function TransactionsScreen() {
  const { activeAccount, accounts, baseCurrency, workspaceId } = useSession();
  const { transactions, categories } = useData();
  const [filter, setFilter] = useState<Filter>('mine');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const accId = activeAccount?.id ?? '';
  const partner = accounts.find((a) => a.id !== accId) ?? null;
  const ownerColors = Object.fromEntries(accounts.map((a) => [a.id, a.color]));

  const filtered = useMemo(() => {
    if (filter === 'both') return transactions;
    if (filter === 'partner' && partner) return transactions.filter((t) => t.accountId === partner.id);
    return transactions.filter((t) => t.accountId === accId);
  }, [filter, transactions, accId, partner]);

  if (!activeAccount || !workspaceId) return null;

  const tabs: { key: Filter; label: string }[] = [
    { key: 'mine', label: activeAccount.name },
    { key: 'partner', label: partner?.name ?? 'Partner' },
    { key: 'both', label: 'Both' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-xl font-bold tracking-tight">Transactions</h1>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              'truncate rounded-md py-1.5 text-sm font-medium transition-colors',
              filter === t.key ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TransactionList
        transactions={filtered}
        categories={categories}
        currency={baseCurrency}
        onSelect={setEditing}
        ownerColors={filter === 'both' ? ownerColors : undefined}
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
