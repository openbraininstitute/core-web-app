import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * The count overlay every bulk action wears. The white ring that lifts it off the button
 * comes from the anchor (`*:ring-2 *:ring-white`), never from a border here — carrying
 * both stacks into a double halo.
 */
export function SelectionCountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <Badge
      rounded
      className={cn(
        'h-5 min-w-5 bg-white px-1 text-[11px] font-bold leading-none shadow-sm',
        className
      )}
    >
      {count}
    </Badge>
  );
}

/**
 * Pins a {@link SelectionCountBadge} to a button's top-right corner. Mirrors the anchor
 * `ExpandingPillContent` applies, for the buttons that own their own layout.
 */
export function SelectionBadgeAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('pointer-events-none absolute z-10', className)}>
      <span className="block -translate-y-1/2 *:ring-2 *:ring-white">{children}</span>
    </span>
  );
}
