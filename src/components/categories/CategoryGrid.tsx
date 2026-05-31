import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function CategoryGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-3 sm:grid-cols-4', className)}>{children}</div>
  );
}
