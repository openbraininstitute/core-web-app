'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { OperatorId } from '@/features/data-grid/core';
import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';
import { cn } from '@/utils/css-class';

import type { ColumnProps } from 'antd/es/table';
import type { ComponentProps, ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

/** Cell-click callback compatible with the antd `OnCellClick` used across circuit tables. */
export type CircuitCellClick = (
  basePath: string,
  record: ICircuit,
  type: TExtendedEntitiesTypeDict
) => void;

/** Recursion guard against cyclic API data: beyond this depth rows can no longer expand. */
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

type TDisplayRow = ICircuit | CircuitDetailRow;

/** Interleave a synthetic full-width detail row after each expanded circuit that has subcircuits. */
export function interleaveCircuitRows(
  circuits: ReadonlyArray<ICircuit>,
  expandedIds: ReadonlyArray<string>,
  depth: number
): TDisplayRow[] {
  if (expandedIds.length === 0) return [...circuits];
  const expanded = new Set(expandedIds);
  const out: TDisplayRow[] = [];
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
 * Adapt antd `ColumnProps` to the renderer-agnostic {@link ISimpleColumn}s used by the
 * shared grid engine, attaching a best-effort text filter and value accessor per column.
 */
export function adaptCircuitColumns(
  columns: ReadonlyArray<ColumnProps<ICircuit>>
): Array<ISimpleColumn<ICircuit>> {
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
      align: col.align as ISimpleColumn<ICircuit>['align'],
      width,
      field: id,
      sortField: id,
      sortable: true,
      filter: { operators: [OperatorId.Ilike], field: id },
      getValue: (row: ICircuit) => primitiveField(row, id),
      renderCell: render
        ? (row: ICircuit) => render(undefined, row, 0) as ReactNode
        : (row: ICircuit) => (row as unknown as Record<string, ReactNode>)[id] ?? null,
    } satisfies ISimpleColumn<ICircuit>;
  });
}

/** The "↳ SUBCIRCUITS" detail wrapper shared by every expanded level. */
export function SubcircuitsDetail({ children }: { children: ReactNode }) {
  return (
    // Nested wrappers are DOM-nested, so this indent step compounds per level; the left
    // border is the tree guide line.
    <div className="border-neutral-3 ml-5 flex w-full flex-col items-start gap-3 border-l-2 py-3 pl-4">
      <div className="flex flex-row items-center gap-2">
        <ArrowReturnRight className="text-neutral-4 text-2xl" />
        <div className="text-neutral-4 text-base font-semibold uppercase">subcircuits</div>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}

export type CircuitRecursiveGridProps = {
  /** Circuits (possibly enriched with `sub_circuits`) to render at this level. */
  circuits: ReadonlyArray<ICircuit> | undefined;
  /** antd column defs, adapted internally. Ignored when {@link simpleColumns} is supplied. */
  columns?: ReadonlyArray<ColumnProps<ICircuit>>;
  /**
   * Pre-built {@link ISimpleColumn}s used verbatim, so every depth is column-identical.
   * Takes precedence over `columns`.
   */
  simpleColumns?: ReadonlyArray<ISimpleColumn<ICircuit>>;
  dataType: TExtendedEntitiesTypeDict;
  onCellClick?: CircuitCellClick;
  /** Optional per-row class (e.g. hierarchy filtered-in/out styling). */
  rowClassName?: (record: ICircuit) => string;
  /** Nesting depth; 0 at the top level. Recursion stops at {@link MAX_CIRCUIT_DEPTH}. */
  depth?: number;
  /** Circuit id of the parent whose subcircuits this grid renders; undefined at the top level. */
  parentId?: string;
  /** Show a loading spinner instead of the (empty) grid. */
  loading?: boolean;
  /** Column id whose cell hosts the expander; omit for a fixed leading expander column. */
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
 * Depth-limited, self-recursive grid for circuit subcircuit trees on top of {@link InMemoryGrid}.
 * Filters, chooser, sort and pagination are enabled at the top level only.
 */
export function CircuitRecursiveGrid({
  circuits,
  columns = [],
  simpleColumns,
  dataType,
  onCellClick,
  rowClassName,
  depth = 0,
  parentId,
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

  const adaptedColumns = useMemo<ISimpleColumn<ICircuit>[]>(
    () =>
      (simpleColumns ? [...simpleColumns] : adaptCircuitColumns(columns)).map((c) => ({
        ...c,
        width: { ...c.width, resizable: true },
      })),
    [simpleColumns, columns]
  );

  // Nested grids are separate instances, so the top-level chooser's hidden set must be
  // mirrored down the tree to keep every depth column-consistent.
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const visibleColumns = useMemo<ISimpleColumn<ICircuit>[]>(() => {
    if (hiddenColumns.length === 0) return adaptedColumns;
    const hidden = new Set(hiddenColumns);
    return adaptedColumns.filter((c) => !hidden.has(c.id));
  }, [adaptedColumns, hiddenColumns]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: CircuitRecursiveGrid is a stable module-level self-reference (recursion)
  const expansion = useMemo(
    () =>
      canExpand
        ? {
            // same host column at every depth, so the chevron never shifts
            columnId: expandColumnId,
            align: 'right' as const,
            isExpandable: (row: ICircuit) => subCircuitsOf(row).length > 0,
            initialHeight: 96,
            renderDetail: (row: ICircuit) => (
              <SubcircuitsDetail>
                <CircuitRecursiveGrid
                  circuits={subCircuitsOf(row)}
                  simpleColumns={visibleColumns}
                  expandColumnId={expandColumnId}
                  dataType={dataType}
                  onCellClick={onCellClick}
                  rowClassName={rowClassName}
                  depth={depth + 1}
                  parentId={row.id}
                />
              </SubcircuitsDetail>
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
    // level + parent id make any depth of the tree addressable in the DOM
    <div
      id={`circuit-grid-level-${depth}${parentId ? `-${parentId}` : ''}`}
      data-grid-level={depth}
      data-parent-id={parentId}
      className="w-full"
    >
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
    </div>
  );
}

export default CircuitRecursiveGrid;
