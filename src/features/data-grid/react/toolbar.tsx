import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * Host-owned controls, named by what they are rather than where they sit, so the toolbar
 * decides the order. All optional — a surface renders only the pickers it needs.
 */
export interface IDataGridToolbarSlots {
  /** entity-type count selector — left cluster, first */
  entityType?: ReactNode;
  /** scope (Public / Project) selector — left cluster, second */
  scope?: ReactNode;
  /** brain-region tree selector — left cluster, third */
  brainRegion?: ReactNode;
  /** anything else the host contributes to the left cluster (e.g. a view toggle) */
  left?: ReactNode;
  /** quick-search input — right cluster, first */
  search?: ReactNode;
}

export interface IDataGridToolbarProps {
  slots?: IDataGridToolbarSlots;
  /** the advanced/active filters control — right cluster, after the search */
  filters?: ReactNode;
  /** the column chooser — right cluster, last */
  columnChooser?: ReactNode;
  className?: string;
}

/**
 * Thin toolbar shell: one row, two clusters — what you are looking at on the left, what
 * you do to it on the right. `flex-wrap` drops the right cluster to its own line when
 * narrow rather than crushing the left pickers.
 */
export function DataGridToolbar({
  slots,
  filters,
  columnChooser,
  className,
}: IDataGridToolbarProps) {
  const hasLeft = slots?.entityType || slots?.scope || slots?.brainRegion || slots?.left;
  const hasRight = slots?.search || filters || columnChooser;
  if (!hasLeft && !hasRight) return null;

  return (
    <div
      className={cn('flex min-h-10 w-full flex-wrap items-center gap-2 px-1 py-2', className)}
      data-testid="data-grid-toolbar"
    >
      {hasLeft ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {slots?.entityType}
          {slots?.scope}
          {slots?.brainRegion}
          {slots?.left}
        </div>
      ) : null}
      {hasRight ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {slots?.search}
          {filters}
          {columnChooser}
        </div>
      ) : null}
    </div>
  );
}
