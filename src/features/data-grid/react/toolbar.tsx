import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export interface DataGridToolbarSlots {
  /** host-owned controls on the left (e.g. scope / species selectors) */
  left?: ReactNode;
  /** quick-search input */
  search?: ReactNode;
  /** host-owned controls on the right (e.g. entity-type selector) */
  right?: ReactNode;
  /** bulk actions shown when rows are selected (download / delete) */
  bulkActions?: ReactNode;
}

export interface DataGridToolbarProps {
  slots?: DataGridToolbarSlots;
  count?: ReactNode;
  columnChooser?: ReactNode;
  className?: string;
}

/**
 * Thin toolbar shell. The grid owns table-scoped controls (count, column chooser,
 * bulk actions); the host injects workspace controls through {@link DataGridToolbarSlots}.
 */
export function DataGridToolbar({ slots, count, columnChooser, className }: DataGridToolbarProps) {
  const hasAnything =
    slots?.left || slots?.search || slots?.right || slots?.bulkActions || count || columnChooser;
  if (!hasAnything) return null;

  return (
    <div className={cn('flex min-h-10 w-full items-center gap-2 px-1 py-2', className)}>
      {slots?.left}
      {slots?.search}
      <div className="ml-auto flex items-center gap-2">
        {count}
        {slots?.bulkActions}
        {slots?.right}
        {columnChooser}
      </div>
    </div>
  );
}
