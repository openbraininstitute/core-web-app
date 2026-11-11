import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * The row above a bordered panel: `start` (breadcrumb) on the left, `end` on the right. It sits
 * in its own row, never on the panel's border, flush with the panel's left edge (no inset), and
 * the morphing tabs rail uses the same 48px row. The row collapses when every slot renders
 * nothing (slots may hold components that return null, so this is CSS `:empty`, not a prop check).
 */
export function TopBar({
  start,
  end,
  className,
}: {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="top-bar"
      className={cn(
        'flex h-12 shrink-0 items-center justify-between gap-2 not-has-[>div:not(:empty)]:hidden',
        className
      )}
    >
      <div className="flex min-w-0">{start}</div>
      <div className="flex min-w-0 justify-end">{end}</div>
    </div>
  );
}
