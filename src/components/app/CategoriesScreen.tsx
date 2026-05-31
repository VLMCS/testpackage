import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { CategoryEditorDialog } from '@/components/categories/CategoryEditorDialog';
import { Plus, Repeat } from 'lucide-react';
import type { Category } from '@/types';

type EditableType = 'expense' | 'income';

export function CategoriesScreen() {
  const { workspaceId } = useSession();
  const { categories } = useData();
  const [editing, setEditing] = useState<Category | null>(null);
  const [addType, setAddType] = useState<EditableType | null>(null);

  if (!workspaceId) return null;

  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');
  const recurring = categories.filter((c) => c.type === 'recurring');

  const open = editing !== null || addType !== null;

  return (
    <div className="space-y-6">
      <h1 className="px-1 text-xl font-bold tracking-tight">Categories</h1>

      <Section title="Expenses">
        <CategoryGrid>
          {expense.map((c) => (
            <CategoryCard key={c.id} category={c} onClick={() => setEditing(c)} />
          ))}
          <AddTile onClick={() => setAddType('expense')} />
        </CategoryGrid>
      </Section>

      <Section title="Income">
        <CategoryGrid>
          {income.map((c) => (
            <CategoryCard key={c.id} category={c} onClick={() => setEditing(c)} />
          ))}
          <AddTile onClick={() => setAddType('income')} />
        </CategoryGrid>
      </Section>

      {recurring.length > 0 && (
        <Section title="Recurring">
          <div className="flex items-start gap-2 rounded-xl border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Recurring bills get their own tab with monthly carry-over and checkboxes — coming in
              the next update.
            </p>
          </div>
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
