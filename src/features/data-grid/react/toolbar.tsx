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
  columnChooser?: ReactNode;
  className?: string;
}

/**
 * Thin toolbar shell. Left cluster is the column chooser + quick-search (`column |
 * search`); the right cluster holds bulk actions and host controls. The results/
 * selection counts live in the footer, not here.
 */
export function DataGridToolbar({ slots, columnChooser, className }: DataGridToolbarProps) {
  const hasAnything =
    slots?.left || slots?.search || slots?.right || slots?.bulkActions || columnChooser;
  if (!hasAnything) return null;

  return (
    <div className={cn('flex min-h-10 w-full items-center gap-2 px-1 py-2', className)}>
      {columnChooser}
      {slots?.search}
      {slots?.left}
      <div className="ml-auto flex items-center gap-2">
        {slots?.bulkActions}
        {slots?.right}
      </div>
    </div>
  );
}
