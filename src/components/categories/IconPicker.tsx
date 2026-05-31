import { PICKABLE_ICONS, getCategoryIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-lg border p-2">
      {PICKABLE_ICONS.map((name) => {
        const Icon = getCategoryIcon(name);
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
              value === name ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
            aria-label={name}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
