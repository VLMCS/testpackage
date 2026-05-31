import { type ButtonHTMLAttributes } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({ value, onChange, maxLength = 6 }: PinPadProps) {
  function press(digit: string) {
    if (value.length >= maxLength) return;
    onChange(value + digit);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center gap-7">
      <div className="flex gap-3">
        {Array.from({ length: maxLength }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full border transition-colors',
              i < value.length ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((d) => (
          <PadButton key={d} onClick={() => press(d)}>
            {d}
          </PadButton>
        ))}
        <div />
        <PadButton onClick={() => press('0')}>0</PadButton>
        <PadButton onClick={backspace} aria-label="Delete last digit">
          <Delete className="h-6 w-6" />
        </PadButton>
      </div>
    </div>
  );
}

function PadButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-medium text-secondary-foreground transition-transform hover:bg-secondary/80 active:scale-95',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
