import { getCategoryIcon } from '@/lib/icons';
import { isLightColor } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

export function CategoryCard({
  category,
  selected,
  onClick,
  subtitle,
}: {
  category: Category;
  selected?: boolean;
  onClick?: () => void;
  subtitle?: string;
}) {
  const Icon = getCategoryIcon(category.icon);
  const darkGlyph = isLightColor(category.color);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center shadow-sm transition-all',
        onClick && 'hover:shadow-md active:scale-95',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: category.color }}
      >
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className={cn('h-7 w-7', darkGlyph ? 'text-slate-900' : 'text-white')} />
        )}
      </span>
      <span className="line-clamp-2 text-xs font-medium leading-tight">{category.name}</span>
      {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
    </button>
  );
}
