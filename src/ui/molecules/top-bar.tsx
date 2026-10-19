import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * The row above a bordered panel: `start` (breadcrumb) on the left, `center` (e.g. a copy action)
 * in the middle, `end` on the right. It sits in its own row, never on the panel's border, and the
 * morphing tabs rail uses the same 48px row. `center` stays truly centred whatever the width of
 * `start` and `end`. The row collapses when every slot renders nothing (slots may hold components
 * that return null, so this is CSS `:empty`, not a prop check).
 */
export function TopBar({
  start,
  center,
  end,
  className,
}: {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="top-bar"
      className={cn(
        'grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 not-has-[>div:not(:empty)]:hidden',
        className
      )}
    >
      <div className="col-start-1 flex min-w-0">{start}</div>
      <div className="col-start-2 flex">{center}</div>
      <div className="col-start-3 flex min-w-0 justify-end">{end}</div>
    </div>
  );
}
