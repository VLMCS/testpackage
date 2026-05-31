import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { CategoryEditorDialog } from '@/components/categories/CategoryEditorDialog';
import { currentMonthKey, monthKeyOf } from '@/lib/date';
import { formatCents } from '@/lib/money';
import { Plus } from 'lucide-react';
import type { Category } from '@/types';

type EditableType = 'expense' | 'income';

export function CategoriesScreen() {
  const { activeAccount, baseCurrency, workspaceId } = useSession();
  const { categories, transactions } = useData();
  const [editing, setEditing] = useState<Category | null>(null);
  const [addType, setAddType] = useState<EditableType | null>(null);

  const accId = activeAccount?.id ?? '';
  const month = currentMonthKey();

  // This-month total per category (for the active account) shown on each card.
  const monthByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) {
      if (t.accountId !== accId) continue;
      if (monthKeyOf(t.date) !== month) continue;
      m[t.categoryId] = (m[t.categoryId] ?? 0) + t.amountCents;
    }
    return m;
  }, [transactions, accId, month]);

  if (!workspaceId) return null;

  const subtitleFor = (c: Category) =>
    monthByCat[c.id] ? formatCents(monthByCat[c.id], baseCurrency) : undefined;

  const mine = categories.filter((c) => c.accountId === accId);
  const expense = mine.filter((c) => c.type === 'expense');
  const income = mine.filter((c) => c.type === 'income');
  const recurring = mine.filter((c) => c.type === 'recurring');

  const open = editing !== null || addType !== null;

  return (
    <div className="space-y-6">
      <h1 className="px-1 text-xl font-bold tracking-tight">Categories</h1>

      <Section title="Expenses">
        <CategoryGrid>
          {expense.map((c) => (
            <CategoryCard key={c.id} category={c} subtitle={subtitleFor(c)} onClick={() => setEditing(c)} />
          ))}
          <AddTile onClick={() => setAddType('expense')} />
        </CategoryGrid>
      </Section>

      <Section title="Income">
        <CategoryGrid>
          {income.map((c) => (
            <CategoryCard key={c.id} category={c} subtitle={subtitleFor(c)} onClick={() => setEditing(c)} />
          ))}
          <AddTile onClick={() => setAddType('income')} />
        </CategoryGrid>
      </Section>

      {recurring.length > 0 && (
        <Section title="Recurring">
          <CategoryGrid>
            {recurring.map((c) => (
              <CategoryCard key={c.id} category={c} subtitle={subtitleFor(c)} onClick={() => setEditing(c)} />
            ))}
          </CategoryGrid>
          <p className="px-1 text-xs text-muted-foreground">
            Manage the bills themselves in the Recurring tab. Tap here to recolor, change the icon,
            or turn off "Count toward Top Category".
          </p>
        </Section>
      )}

      <CategoryEditorDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setAddType(null);
          }
        }}
        workspaceId={workspaceId}
        accountId={accId}
        editing={editing}
        defaultType={addType ?? 'expense'}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-muted-foreground transition-colors hover:bg-accent"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Plus className="h-6 w-6" />
      </span>
      <span className="text-xs font-medium">Add</span>
    </button>
  );
}
