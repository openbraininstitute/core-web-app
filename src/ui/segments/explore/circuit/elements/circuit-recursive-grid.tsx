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

/**
 * The shared "↳ SUBCIRCUITS" detail wrapper. One component → one style + one indent
 * for every expanded level (top-level plugin detail AND the deeper recursion), so the
 * heading never drifts between levels. Content is inset (`ml-4`) so each nested table
 * shifts right of its DIRECT parent.
 */
export function SubcircuitsDetail({ children }: { children: ReactNode }) {
  return (
    // Each nested SubcircuitsDetail adds this step (margin + guide line + padding) ON
    // TOP of its parent's — because the deeper grid is DOM-nested inside this one — so
    // the tree visibly shifts right one level at a time. The left border is the tree
    // guide line.
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
  /**
   * antd column defs from `useDataTableColumns` (adapted internally). Ignored when
   * {@link simpleColumns} is supplied. Optional so a caller can drive the grid purely
   * from pre-built {@link SimpleColumn}s.
   */
  columns?: ReadonlyArray<ColumnProps<ICircuit>>;
  /**
   * Pre-built {@link SimpleColumn}s, used verbatim (skips `adaptCircuitColumns`). This
   * is how the circuit PLUGIN feeds the nested subcircuit grid the SAME schema columns
   * the parent server grid renders, so every depth is column-identical. When set,
   * `columns` is ignored. Recursion forwards these (filtered by the hidden set) down.
   */
  simpleColumns?: ReadonlyArray<SimpleColumn<ICircuit>>;
  dataType: TExtendedEntitiesTypeDict;
  onCellClick?: CircuitCellClick;
  /** Optional per-row class (e.g. hierarchy filtered-in/out styling). */
  rowClassName?: (record: ICircuit) => string;
  /** Nesting depth; 0 at the top level. Recursion stops at {@link MAX_CIRCUIT_DEPTH}. */
  depth?: number;
  /** Circuit id of the DIRECT parent whose subcircuits this grid renders (for the
   * container's `data-parent-id`). Undefined at the outermost level. */
  parentId?: string;
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

  // Column source: pre-built `simpleColumns` verbatim (the plugin path — identical to
  // the parent's schema columns), else adapt the antd `columns` (legacy path). Enable
  // interactive resize on every column either way.
  const adaptedColumns = useMemo<SimpleColumn<ICircuit>[]>(
    () =>
      (simpleColumns ? [...simpleColumns] : adaptCircuitColumns(columns)).map((c) => ({
        ...c,
        width: { ...c.width, resizable: true },
      })),
    [simpleColumns, columns]
  );

  // The chooser lives on the top-level grid, but nested subcircuit grids are separate
  // grid instances — so mirror the hidden set down the tree (by column id) to keep
  // every depth column-consistent. Recursion is always driven by `simpleColumns`.
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const visibleColumns = useMemo<SimpleColumn<ICircuit>[]>(() => {
    if (hiddenColumns.length === 0) return adaptedColumns;
    const hidden = new Set(hiddenColumns);
    return adaptedColumns.filter((c) => !hidden.has(c.id));
  }, [adaptedColumns, hiddenColumns]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: CircuitRecursiveGrid is a stable module-level self-reference (recursion)
  const expansion = useMemo(
    () =>
      canExpand
        ? {
            // host the chevron in the same (Subcircuits) column at every depth. The
            // default remixicon chevron is used (visible, follows currentColor → white
            // on hover) — no custom glyph.
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
    // Container carries the hierarchy level in its id + the direct parent circuit id
    // (`data-parent-id`), so any depth of the subcircuit tree is addressable in the DOM.
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
