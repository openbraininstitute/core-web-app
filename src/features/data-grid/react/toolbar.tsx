import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * Host-owned controls, named by WHAT THEY ARE rather than by where they sit, so the
 * toolbar — not each caller — decides the order. Every one is optional: a surface
 * renders only the pickers it actually needs (a workflow picker has no entity-type
 * count; a listing with no hierarchy has no brain region).
 */
export interface IDataGridToolbarSlots {
  /** scope (Public / Project) selector — left cluster, first */
  scope?: ReactNode;
  /** brain-region tree selector — left cluster, second */
  brainRegion?: ReactNode;
  /** entity-type count selector — left cluster, third */
  entityType?: ReactNode;
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
 * Thin toolbar shell, one row, two clusters.
 *
 * LEFT is what the listing IS — the scope, the brain region, the entity type. RIGHT
 * is what you DO to it — search, filter, choose columns — grouped at the far edge so
 * the three controls that change the view sit together under one hand instead of
 * being split across the bar. Bulk actions and the results/selection counts are not
 * here: they live in the footer, beside the rows they talk about.
 *
 * `flex-wrap` is the narrow-width behaviour: the right cluster drops to its own line
 * rather than crushing the left pickers.
 */
export function DataGridToolbar({
  slots,
  filters,
  columnChooser,
  className,
}: IDataGridToolbarProps) {
  const hasLeft = slots?.scope || slots?.brainRegion || slots?.entityType || slots?.left;
  const hasRight = slots?.search || filters || columnChooser;
  if (!hasLeft && !hasRight) return null;

  return (
    <div
      className={cn('flex min-h-10 w-full flex-wrap items-center gap-2 px-1 py-2', className)}
      data-testid="data-grid-toolbar"
    >
      {hasLeft ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {slots?.scope}
          {slots?.brainRegion}
          {slots?.entityType}
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
