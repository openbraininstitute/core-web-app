import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * Host-owned controls, named by what they are rather than where they sit, so the toolbar
 * decides the order. All optional — a surface renders only the pickers it needs.
 */
export interface IDataGridToolbarSlots {
  /** the page's own call to action (e.g. upload) — left cluster, before the pickers */
  action?: ReactNode;
  /** entity-type count selector — left cluster, first picker */
  entityType?: ReactNode;
  /** scope (Public / Project) selector — left cluster, second */
  scope?: ReactNode;
  /** brain-region tree selector — left cluster, third */
  brainRegion?: ReactNode;
  /** anything else the host contributes to the left cluster (e.g. a view toggle) */
  left?: ReactNode;
  /** free-text search input — right cluster, first */
  search?: ReactNode;
}

export interface IDataGridToolbarProps {
  slots?: IDataGridToolbarSlots;
  /** the bulk actions — the exact middle, when the grid puts them up here */
  bulkActions?: ReactNode;
  /** the advanced/active filters control — right cluster, after the search */
  filters?: ReactNode;
  /** the column chooser — right cluster, last */
  columnChooser?: ReactNode;
  className?: string;
}

/**
 * Thin toolbar shell: one row, two clusters — what you are looking at on the left, what
 * you do to it on the right. `flex-wrap` drops the right cluster to its own line when
 * narrow rather than crushing the left pickers. Bulk actions sit between them, centred
 * the way the footer centres its pager.
 */
export function DataGridToolbar({
  slots,
  bulkActions,
  filters,
  columnChooser,
  className,
}: IDataGridToolbarProps) {
  const hasLeft =
    slots?.action || slots?.entityType || slots?.scope || slots?.brainRegion || slots?.left;
  const hasRight = slots?.search || filters || columnChooser;
  const centred = Boolean(bulkActions);
  if (!hasLeft && !hasRight && !centred) return null;

  return (
    <div
      className={cn('flex min-h-10 w-full flex-wrap items-center gap-2 px-1 py-2', className)}
      data-testid="data-grid-toolbar"
    >
      {hasLeft || centred ? (
        <div
          className={cn(
            'flex items-center gap-2',
            centred ? 'min-w-fit flex-1 basis-0' : 'min-w-0 flex-wrap'
          )}
        >
          {slots?.action}
          {slots?.entityType}
          {slots?.scope}
          {slots?.brainRegion}
          {slots?.left}
        </div>
      ) : null}
      {bulkActions}
      {hasRight || centred ? (
        <div
          className={cn(
            'flex items-center gap-2',
            centred ? 'min-w-fit flex-1 basis-0 justify-end' : 'ml-auto shrink-0'
          )}
        >
          {slots?.search}
          {filters}
          {columnChooser}
        </div>
      ) : null}
    </div>
  );
}
