'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import ChevronRight from '@/components/icons/ChevronRight';
import { buildSimpleColDefs, type SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import { registerDataGridModules } from '@/features/data-grid/renderers/aggrid/register-modules';
import { dataGridTheme } from '@/features/data-grid/renderers/aggrid/theme';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import type { ColumnProps } from 'antd/es/table';
import type { ComponentProps, ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

registerDataGridModules();

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

const EXPAND_COL_ID = '__circuit_expand';

/** Fallback height for a detail row before its nested grid has measured itself. */
const INITIAL_DETAIL_HEIGHT = 96;

/** Synthetic full-width row that hosts the nested grid of a circuit's subcircuits. */
interface CircuitDetailRow {
  readonly __circuitDetail: true;
  /** id of the parent circuit row this detail belongs to */
  readonly parentId: string;
  /** the subcircuits to render in the nested grid */
  readonly children: ReadonlyArray<ICircuitEnriched>;
  /** depth of the nested grid (parent depth + 1) */
  readonly depth: number;
}

type DisplayRow = ICircuit | CircuitDetailRow;

function isCircuitDetailRow(row: unknown): row is CircuitDetailRow {
  return typeof row === 'object' && row !== null && '__circuitDetail' in row;
}

/** Subcircuits attached to a circuit record (enriched hierarchy nodes), or `[]`. */
function subCircuitsOf(record: ICircuit): ReadonlyArray<ICircuitEnriched> {
  const enriched = record as ICircuitEnriched;
  return enriched.sub_circuits && enriched.sub_circuits.length > 0 ? enriched.sub_circuits : [];
}

/**
 * Interleave a synthetic full-width detail row after each expanded circuit that
 * has subcircuits. Pure (no React) so the recursion/expansion bookkeeping is
 * unit-testable in isolation. Mirrors `interleaveDetailRows` from the server grid
 * but carries the children + depth needed to mount a nested grid.
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

/**
 * Adapt the antd `ColumnProps` produced by `useDataTableColumns` to the
 * renderer-agnostic {@link SimpleColumn}s consumed by `buildSimpleColDefs`. The
 * antd `render(value, record, index)` becomes an inline `renderCell(row)`; the
 * rich `title` node becomes `headerNode`. Pure — no hooks — so it is testable.
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
      header: id,
      headerNode: col.title as ReactNode,
      align: col.align as SimpleColumn<ICircuit>['align'],
      width,
      renderCell: render
        ? (row: ICircuit) => render(undefined, row, 0) as ReactNode
        : (row: ICircuit) => (row as unknown as Record<string, ReactNode>)[id] ?? null,
    } satisfies SimpleColumn<ICircuit>;
  });
}

type CircuitGridContext = {
  columns: ReadonlyArray<ColumnProps<ICircuit>>;
  dataType: TExtendedEntitiesTypeDict;
  onCellClick?: CircuitCellClick;
  rowClassName?: (record: ICircuit) => string;
};

/**
 * Full-width renderer for a synthetic detail row: mounts a nested
 * {@link CircuitRecursiveGrid} for the parent circuit's subcircuits and forwards
 * its measured height to the AG Grid row node so deeply-nested trees never clip
 * or jitter (mirrors `AgDetailCell` from the server grid).
 */
function CircuitDetailCell(props: ICellRendererParams<DisplayRow>) {
  const ref = useRef<HTMLDivElement>(null);
  const detail = props.data;
  const ctx = props.context as CircuitGridContext;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const target = Math.max(el.scrollHeight, INITIAL_DETAIL_HEIGHT);
      if (props.node.rowHeight !== target) {
        props.node.setRowHeight(target);
        props.api.onRowHeightChanged();
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [props.api, props.node]);

  if (!isCircuitDetailRow(detail)) return null;

  return (
    <div ref={ref} className="border-neutral-2 bg-neutral-1/40 border-b py-3">
      <div className="my-2 ml-2 flex flex-row items-center gap-2">
        <ArrowReturnRight className="text-neutral-4 text-2xl" />
        <div className="text-neutral-4 text-base font-semibold uppercase">subcircuits</div>
      </div>
      <div className="ml-4">
        <CircuitRecursiveGrid
          circuits={detail.children}
          columns={ctx.columns}
          dataType={ctx.dataType}
          onCellClick={ctx.onCellClick}
          rowClassName={ctx.rowClassName}
          depth={detail.depth + 1}
        />
      </div>
    </div>
  );
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
  className?: ComponentProps<'div'>['className'];
};

/**
 * A depth-limited, self-recursive grid for circuit subcircuit trees, built on the
 * shared AG Grid theme + {@link buildSimpleColDefs}. Rows with subcircuits get a
 * leading expander; expanding a row interleaves a full-width detail row that
 * mounts another `CircuitRecursiveGrid` for the children. Replaces the antd
 * `RecursiveExpandableTable`/`BaseTable` recursion.
 */
export function CircuitRecursiveGrid({
  circuits,
  columns,
  dataType,
  onCellClick,
  rowClassName,
  depth = 0,
  loading = false,
  className,
}: CircuitRecursiveGridProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const apiRef = useRef<GridApi<DisplayRow> | null>(null);

  useEffect(() => setMounted(true), []);

  const rows = useMemo<ReadonlyArray<ICircuit>>(() => circuits ?? [], [circuits]);
  const canExpand = depth < MAX_CIRCUIT_DEPTH;

  const anyExpandable = useMemo(
    () => canExpand && rows.some((r) => subCircuitsOf(r).length > 0),
    [canExpand, rows]
  );

  const displayRows = useMemo(
    () => interleaveCircuitRows(rows, expandedIds, depth),
    [rows, expandedIds, depth]
  );

  const colDefs = useMemo(() => {
    const dataCols = adaptCircuitColumns(columns);
    if (!anyExpandable) return buildSimpleColDefs(dataCols, { sortable: false });

    const expandCol: SimpleColumn<ICircuit> = {
      id: EXPAND_COL_ID,
      header: '',
      align: 'center',
      width: { width: 48 },
      renderCell: (row) => {
        if (subCircuitsOf(row).length === 0) return null;
        const isOpen = expandedIds.includes(row.id);
        return (
          <button
            type="button"
            aria-label={isOpen ? 'Collapse subcircuits' : 'Expand subcircuits'}
            className="flex items-center justify-center p-1"
            onClick={(event) => {
              event.stopPropagation();
              setExpandedIds((prev) =>
                prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
              );
            }}
          >
            <ChevronRight
              fill="#003a8c"
              className={classNames(
                'transform transition-transform duration-200 ease-in-out',
                isOpen ? 'rotate-90' : 'rotate-0'
              )}
            />
          </button>
        );
      },
    };

    return buildSimpleColDefs([expandCol, ...dataCols], { sortable: false });
  }, [columns, anyExpandable, expandedIds]);

  // The expander chevron reflects `expandedIds`, but toggling only swaps row data
  // (the detail row) — the parent row's cells are not diffed. Force a refresh so
  // the chevron rotation stays in sync.
  // biome-ignore lint/correctness/useExhaustiveDependencies: expandedIds is the intended trigger, not a body dependency.
  useEffect(() => {
    apiRef.current?.refreshCells({ force: true });
  }, [expandedIds]);

  const context = useMemo<CircuitGridContext>(
    () => ({ columns, dataType, onCellClick, rowClassName }),
    [columns, dataType, onCellClick, rowClassName]
  );

  if (loading) {
    return (
      <div className={cn('flex w-full items-center justify-center py-8', className)}>
        <LoadingOutlined className="text-primary-7" />
      </div>
    );
  }

  if (!mounted) return <div className={cn('ag-data-grid w-full', className)} />;

  return (
    <div className={cn('ag-data-grid w-full', className)}>
      <AgGridReact<DisplayRow>
        theme={dataGridTheme}
        columnDefs={colDefs as ColDef<DisplayRow>[]}
        rowData={displayRows as DisplayRow[]}
        context={context}
        getRowId={(p) =>
          isCircuitDetailRow(p.data)
            ? `circuit-detail:${p.data.parentId}:${p.data.depth}`
            : String((p.data as ICircuit).id)
        }
        domLayout="autoHeight"
        headerHeight={depth === 0 ? 48 : 40}
        suppressCellFocus
        animateRows={false}
        isFullWidthRow={(p) => isCircuitDetailRow(p.rowNode.data)}
        fullWidthCellRenderer={CircuitDetailCell}
        getRowHeight={(p) => (isCircuitDetailRow(p.data) ? INITIAL_DETAIL_HEIGHT : undefined)}
        getRowClass={(p) =>
          !isCircuitDetailRow(p.data) && rowClassName ? rowClassName(p.data as ICircuit) : undefined
        }
        onGridReady={(e) => {
          apiRef.current = e.api;
        }}
        onCellClicked={(e) => {
          if (e.colDef.colId === EXPAND_COL_ID) return;
          if (isCircuitDetailRow(e.data)) return;
          onCellClick?.(pathname, e.data as ICircuit, dataType);
        }}
      />
    </div>
  );
}

export default CircuitRecursiveGrid;
