import { cn } from '@/lib/utils';

export const COLOR_PRESETS = [
  '#2563eb',
  '#db2777',
  '#16a34a',
  '#ea580c',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#d97706',
  '#4f46e5',
  '#0d9488',
  '#be123c',
  '#65a30d',
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Use color ${c}`}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition-transform',
            value.toLowerCase() === c.toLowerCase()
              ? 'scale-110 border-foreground'
              : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/40">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Custom color"
        />
        <span className="flex h-full w-full items-center justify-center text-sm leading-none text-muted-foreground">
          +
        </span>
      </label>
    </div>
  );
}
