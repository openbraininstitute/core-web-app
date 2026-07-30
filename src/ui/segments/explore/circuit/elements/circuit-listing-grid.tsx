'use client';

import { Pagination } from '@/ui/segments/data-table/elements/pagination';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { CircuitRepresentationView } from '@/ui/segments/explore/circuit/helpers';
import { cn } from '@/utils/css-class';

import type { ColumnProps } from 'antd/es/table';
import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Pagination as EntitycorePagination } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceSection } from '@/constants';
import type { OnCellClick } from '@/ui/segments/data-table/table';
import type { TCircuitRepresentationView } from '@/ui/segments/explore/circuit/helpers';

/**
 * Per-row class for the AG-Grid-based circuit listing. Mirrors the legacy
 * `WrapperTable` `rowClassName` in `MainTable`, but targets `.ag-cell` instead of
 * antd `td` (same styling intent: highlight filtered-in rows, dim filtered-out
 * hierarchy rows). Pure so the flat/hierarchy branching is unit-testable.
 */
export function circuitListingRowClass(
  record: ICircuit,
  view: TCircuitRepresentationView | null
): string {
  if ('isFiltered' in record && (record as { isFiltered?: boolean }).isFiltered) {
    return 'filtered-in [&_.ag-cell_svg]:text-primary-8!';
  }
  if (view === CircuitRepresentationView.Hierarchy) {
    return 'filtered-out [&_.ag-cell]:bg-background! [&_.ag-cell]:text-neutral-4!';
  }
  return '[&_.ag-cell_svg]:text-primary-8!';
}

export type CircuitListingGridProps = {
  columns: ColumnProps<ICircuit>[];
  dataSource: Array<ICircuit>;
  dataType: TExtendedEntitiesTypeDict;
  onCellClick?: OnCellClick<ICircuit>;
  loading?: boolean;
  view: TCircuitRepresentationView | null;
  /** Server pagination context (flat view only). */
  dataKey: string;
  section: TWorkspaceSection;
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  /**
   * React key forwarded to the grid so subcircuit expansion state resets when the
   * underlying (hierarchy) data changes — mirrors the legacy `WrapperTable` key.
   */
  gridKey?: string;
  className?: ComponentProps<'div'>['className'];
};

/**
 * Grid render path for the MAIN circuit listing, built on {@link CircuitRecursiveGrid}.
 *
 * Server pagination/facets/filters/search stay external (owned by `MainTable` /
 * `BrowseCircuit`); this only swaps the inner table body. Flat rows carry no
 * `sub_circuits`, so the grid shows no expander; hierarchy rows are enriched, so
 * the grid renders the subcircuit expansion — preserving the flat/hierarchy toggle
 * without any extra branching here. Cell clicks flow through to detail navigation
 * via `onCellClick`.
 */
export function CircuitListingGrid({
  columns,
  dataSource,
  dataType,
  onCellClick,
  loading = false,
  view,
  dataKey,
  section,
  resultPagination,
  gridKey,
  className,
}: CircuitListingGridProps) {
  const isEmpty = !loading && dataSource.length === 0;

  return (
    <div className={cn('flex h-full w-full min-w-0 flex-col', className)}>
      <div className="min-h-0 w-full flex-1 overflow-auto">
        <CircuitRecursiveGrid
          key={gridKey}
          circuits={dataSource}
          columns={columns}
          dataType={dataType}
          onCellClick={onCellClick}
          loading={loading}
          rowClassName={(record) => circuitListingRowClass(record, view)}
        />
        {isEmpty && (
          <div className="text-neutral-4 flex w-full items-center justify-center py-10 text-base">
            No results found.
          </div>
        )}
      </div>
      {view === CircuitRepresentationView.Flat && (
        <div className="w-full pt-3">
          <Pagination {...{ dataKey, dataType, section, resultPagination }} />
        </div>
      )}
    </div>
  );
}

export default CircuitListingGrid;
