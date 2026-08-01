import { Home, LayoutGrid, Plus, ReceiptText, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tab =
  | 'home'
  | 'activity'
  | 'recurring'
  | 'categories'
  | 'profile'
  | 'analytics'
  | 'settings'
  | 'wallets';

export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-md items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <NavButton
          active={active === 'home'}
          onClick={() => onChange('home')}
          icon={<Home className="h-5 w-5" />}
          label="Home"
        />
        <NavButton
          active={active === 'activity'}
          onClick={() => onChange('activity')}
          icon={<ReceiptText className="h-5 w-5" />}
          label="Activity"
        />
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add transaction"
          className="bg-accent-gradient -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
        <NavButton
          active={active === 'recurring'}
          onClick={() => onChange('recurring')}
          icon={<Repeat className="h-5 w-5" />}
          label="Recurring"
        />
        <NavButton
          active={active === 'categories'}
          onClick={() => onChange('categories')}
          icon={<LayoutGrid className="h-5 w-5" />}
          label="Categories"
        />
      </div>
    </nav>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
