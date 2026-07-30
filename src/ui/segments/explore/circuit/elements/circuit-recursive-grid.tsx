'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import ChevronRight from '@/components/icons/ChevronRight';
import { OperatorId } from '@/features/data-grid/core';
import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { ColumnProps } from 'antd/es/table';
import type { ComponentProps, ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

/** Cell-click callback compatible with the antd `OnCellClick` used across circuit tables. */
export type CircuitCellClick = (
  basePath: string,
  record: ICircuit,
  type: TExtendedEntitiesTypeDict
) => void;

/**
 * Hard recursion guard: subcircuit trees are theoretically acyclic but the data
 * comes from the API, so a runaway (or cyclic) tree must never mount grids
 * forever. Beyond this depth the expander is hidden and rows can no longer open.
 */
export const MAX_CIRCUIT_DEPTH = 6;

/** Subcircuits attached to a circuit record (enriched hierarchy nodes), or `[]`. */
function subCircuitsOf(record: ICircuit): ReadonlyArray<ICircuitEnriched> {
  const enriched = record as ICircuitEnriched;
  return enriched.sub_circuits && enriched.sub_circuits.length > 0 ? enriched.sub_circuits : [];
}

/** Synthetic full-width row that hosts the nested grid of a circuit's subcircuits. */
interface CircuitDetailRow {
  readonly __circuitDetail: true;
  readonly parentId: string;
  readonly children: ReadonlyArray<ICircuitEnriched>;
  readonly depth: number;
}

type DisplayRow = ICircuit | CircuitDetailRow;

/**
 * Interleave a synthetic full-width detail row after each expanded circuit that
 * has subcircuits. Pure (no React) so the recursion/expansion bookkeeping is
 * unit-testable in isolation. Retained for its unit tests and as the reference
 * model for the shared engine's own interleaving.
 */
export function interleaveCircuitRows(
  circuits: ReadonlyArray<ICircuit>,
  expandedIds: ReadonlyArray<string>,
  depth: number
): DisplayRow[] {
  if (expandedIds.length === 0) return [...circuits];
  const expanded = new Set(expandedIds);
  const out: DisplayRow[] = [];
  for (const circuit of circuits) {
    out.push(circuit);
    const children = subCircuitsOf(circuit);
    if (expanded.has(circuit.id) && children.length > 0) {
      out.push({ __circuitDetail: true, parentId: circuit.id, children, depth });
    }
  }
  return out;
}

/** Extract a primitive (filter/sort) value for a synthetic column key off a record. */
function primitiveField(row: ICircuit, id: string): string | number | boolean | undefined {
  const v = (row as unknown as Record<string, unknown>)[id];
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : undefined;
}

/** Humanise a column key ("brain_region" → "Brain region") for the column chooser. */
function humanizeColumnId(id: string): string {
  const spaced = id.replace(/[._]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id;
}

/**
 * Adapt the antd `ColumnProps` produced by `useDataTableColumns` to the
 * renderer-agnostic {@link SimpleColumn}s consumed by the shared grid engine. The
 * antd `render(value, record, index)` becomes an inline `renderCell(row)`; the
 * rich `title` node becomes `headerNode`. A best-effort text `filter` + `getValue`
 * (from the record's like-named field) are attached so the shared header filter /
 * sort work over the values that back simple text columns. Pure — no hooks.
 */
export function adaptCircuitColumns(
  columns: ReadonlyArray<ColumnProps<ICircuit>>
): Array<SimpleColumn<ICircuit>> {
  return columns.map((col) => {
    const id = String(col.key ?? '');
    const render = col.render;
    const rawWidth = col.width;
    const width =
      typeof rawWidth === 'number'
        ? { width: rawWidth }
        : typeof rawWidth === 'string'
          ? { width: Number.parseInt(rawWidth, 10) || undefined }
          : undefined;

    return {
      id,
      // plain-text label for the column chooser; the visible header uses `headerNode`
      header: typeof col.title === 'string' ? col.title : humanizeColumnId(id),
      headerNode: col.title as ReactNode,
      align: col.align as SimpleColumn<ICircuit>['align'],
      width,
      field: id,
      sortField: id,
      sortable: true,
      filter: { operators: [OperatorId.Ilike], field: id },
      getValue: (row: ICircuit) => primitiveField(row, id),
      renderCell: render
        ? (row: ICircuit) => render(undefined, row, 0) as ReactNode
        : (row: ICircuit) => (row as unknown as Record<string, ReactNode>)[id] ?? null,
    } satisfies SimpleColumn<ICircuit>;
  });
}

export type CircuitRecursiveGridProps = {
  /** Circuits (possibly enriched with `sub_circuits`) to render at this level. */
  circuits: ReadonlyArray<ICircuit> | undefined;
  /** antd column defs from `useDataTableColumns` (adapted internally). */
  columns: ReadonlyArray<ColumnProps<ICircuit>>;
  dataType: TExtendedEntitiesTypeDict;
  onCellClick?: CircuitCellClick;
  /** Optional per-row class (e.g. hierarchy filtered-in/out styling). */
  rowClassName?: (record: ICircuit) => string;
  /** Nesting depth; 0 at the top level. Recursion stops at {@link MAX_CIRCUIT_DEPTH}. */
  depth?: number;
  /** Show a loading spinner instead of the (empty) grid. */
  loading?: boolean;
  /**
   * Column id whose cell hosts the expander (right-aligned, vertically centred).
   * Omit for a fixed leading expander column. Only honoured at the top level.
   */
  expandColumnId?: string;
  /** Enable per-column custom header filters (top level only). */
  filterable?: boolean;
  /** Show the column show/hide chooser (top level only). */
  showColumnChooser?: boolean;
  /** Enable store-driven sorting via the custom header (top level only). */
  sortable?: boolean;
  /** Enable client-side pagination (top level only — the REGULAR/flat view). */
  pagination?: boolean;
  pageSize?: number;
  className?: ComponentProps<'div'>['className'];
};

/**
 * A depth-limited, self-recursive grid for circuit subcircuit trees, built on the
 * SHARED {@link InMemoryGrid} engine — so it inherits the entity grid's custom
 * header filters, column chooser, sorting, resizing and pagination while keeping
 * its recursive expandable subcircuit rows. Expanding a row interleaves a
 * full-width detail row that mounts another `CircuitRecursiveGrid` for the
 * children. Filters/chooser/sort/pagination are enabled at the top level only.
 */
export function CircuitRecursiveGrid({
  circuits,
  columns,
  dataType,
  onCellClick,
  rowClassName,
  depth = 0,
  loading = false,
  expandColumnId,
  filterable = false,
  showColumnChooser = false,
  sortable = false,
  pagination = false,
  pageSize = 20,
  className,
}: CircuitRecursiveGridProps) {
  const pathname = usePathname();

  const rows = useMemo<ICircuit[]>(() => [...(circuits ?? [])], [circuits]);
  const canExpand = depth < MAX_CIRCUIT_DEPTH;
  const isTop = depth === 0;

  // The chooser lives on the top-level grid, but nested subcircuit grids are
  // separate grid instances — so mirror the hidden set down the tree (by antd
  // column `key`) to keep every depth column-consistent.
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const visibleColumns = useMemo(() => {
    if (hiddenColumns.length === 0) return columns;
    const hidden = new Set(hiddenColumns);
    return columns.filter((c) => !hidden.has(String(c.key ?? '')));
  }, [columns, hiddenColumns]);

  // Adapt once, then enable interactive resize on every column.
  const adaptedColumns = useMemo(
    () =>
      adaptCircuitColumns(columns).map((c) => ({ ...c, width: { ...c.width, resizable: true } })),
    [columns]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: CircuitRecursiveGrid is a stable module-level self-reference (recursion)
  const expansion = useMemo(
    () =>
      canExpand
        ? {
            columnId: isTop ? expandColumnId : undefined,
            align: 'right' as const,
            isExpandable: (row: ICircuit) => subCircuitsOf(row).length > 0,
            initialHeight: 96,
            renderExpander: (open: boolean) => (
              <ChevronRight
                fill="#003a8c"
                className={classNames(
                  'transform transition-transform duration-200 ease-in-out',
                  open ? 'rotate-90' : 'rotate-0'
                )}
              />
            ),
            renderDetail: (row: ICircuit) => (
              <div className="border-neutral-2 bg-neutral-1/40 border-b py-3">
                <div className="my-2 ml-2 flex flex-row items-center gap-2">
                  <ArrowReturnRight className="text-neutral-4 text-2xl" />
                  <div className="text-neutral-4 text-base font-semibold uppercase">
                    subcircuits
                  </div>
                </div>
                <div className="ml-4">
                  <CircuitRecursiveGrid
                    circuits={subCircuitsOf(row)}
                    columns={visibleColumns}
                    dataType={dataType}
                    onCellClick={onCellClick}
                    rowClassName={rowClassName}
                    depth={depth + 1}
                  />
                </div>
              </div>
            ),
          }
        : undefined,
    [canExpand, isTop, expandColumnId, visibleColumns, dataType, onCellClick, rowClassName, depth]
  );

  if (loading) {
    return (
      <div className={cn('flex w-full items-center justify-center py-8', className)}>
        <LoadingOutlined className="text-primary-7" />
      </div>
    );
  }

  return (
    <InMemoryGrid<ICircuit>
      columns={adaptedColumns}
      rows={rows}
      getRowId={(row) => String(row.id)}
      filterable={isTop && filterable}
      showColumnChooser={isTop && showColumnChooser}
      onHiddenColumnsChange={isTop && showColumnChooser ? setHiddenColumns : undefined}
      sortable={isTop && sortable}
      pagination={isTop && pagination}
      pageSize={pageSize}
      headerHeight={isTop ? 48 : 40}
      expansion={expansion}
      getRowClass={rowClassName}
      onRowClick={(row) => onCellClick?.(pathname, row, dataType)}
      className={className}
    />
  );
}

export default CircuitRecursiveGrid;
