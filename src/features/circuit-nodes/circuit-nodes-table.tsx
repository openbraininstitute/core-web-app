'use client';

import { Empty, Progress, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { NodesToolbar } from '@/features/circuit-nodes/components/nodes-toolbar';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import { GenericError } from '@/ui/molecules/generic-error';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { FilterModel, ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/** The cells a 3D view beside the table shows, as the table narrows them, and what it points out. */
export type TableCells = {
  /**
   * Told the cells to show, by node index, once the table has them: the ticked
   * ones, else the rows its filter keeps; null for every cell.
   */
  onShownCellsChange: (shown: {
    population: string;
    cells: Uint32Array | null;
    rowCount: number;
  }) => void;
  /** Told the node index of the row under the pointer, and null when it leaves. */
  onHoveredCellChange: (cell: number | null) => void;
  /** A cell to bring into view, such as one clicked in the scene: a new key asks again. */
  focusedCell?: { nodeId: number; key: number };
  /** The cell clicked in the scene, whose row stays marked until it is let go. */
  heldCell?: number | null;
  /** A reset of the filters and ticks asked for from the scene: a new number each time. */
  resetRequest?: number;
};

const NO_TICKS: ReadonlySet<number> = new Set();
const EMPTY_FILTER: FilterModel = {};

type Props = {
  circuit: ICircuit;
  className?: string;
  /** when set with `onPopulationChange`, population is controlled by the parent */
  populationName?: string;
  onPopulationChange?: (name: string) => void;
  /** Rows to tick and point out, for a 3D view that shows what the table narrows it to. */
  cells?: TableCells;
};

export default function CircuitNodesTable({
  circuit,
  className,
  populationName: controlledPopulationName,
  onPopulationChange,
  cells,
}: Props) {
  const { config, isLoading: configLoading, error: configError } = useCircuitConfig(circuit);

  const [view, setView] = useState<ViewMode>('nodes');
  const [internalPopulationName, setInternalPopulationName] = useState<string | undefined>();

  const isControlled = onPopulationChange !== undefined;
  const selectedPopulationName = isControlled ? controlledPopulationName : internalPopulationName;
  const setSelectedPopulationName = isControlled ? onPopulationChange : setInternalPopulationName;

  const population = useMemo(
    () => (config ? resolvePopulation(config.nodes, selectedPopulationName) : undefined),
    [config, selectedPopulationName]
  );

  const enabled = view === 'nodes';

  const {
    rowCount,
    filteredCount,
    columns,
    datasource,
    status,
    getFilteredIndices,
    getRowIndex,
    isLoading: workerLoading,
    progress: downloadProgress,
    error: workerError,
  } = useNodesWorker({
    enabled,
    circuitId: circuit.id,
    circuitAssetId: config?.circuitAssetId ?? '',
    population,
  });
  const selection = useTableCells({
    cells,
    population: population?.name ?? '',
    ready: status === 'ready',
    rowCount,
    getFilteredIndices,
    getRowIndex,
  });

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const lastColumnsKeyRef = useRef<string>('');

  useEffect(() => {
    if (!columns || columns.length === 0) return;
    const key = columns.map((c) => c.name).join('|');
    if (key === lastColumnsKeyRef.current) return;
    lastColumnsKeyRef.current = key;
    setVisibleColumns(defaultVisibleColumnSet(columns));
  }, [columns]);

  return (
    <div className={cn(styles.root, className)}>
      <NodesToolbar
        view={view}
        onViewChange={setView}
        populations={config?.nodes ?? []}
        populationName={population?.name}
        onPopulationChange={setSelectedPopulationName}
      />
      <div className={styles.body}>
        {renderBody({
          configError,
          configLoading,
          workerError,
          workerLoading,
          downloadProgress,
          hasPopulation: !!population,
          columns,
          rowCount,
          filteredCount,
          datasource,
          visibleColumns,
          setVisibleColumns,
          selection,
        })}
      </div>
    </div>
  );
}

/** What the grid is handed to tick rows and point cells out. */
type GridSelection = Pick<
  ComponentProps<typeof NodesGrid>,
  | 'onFilterModelChange'
  | 'initialFilterModel'
  | 'filterScope'
  | 'onRowClick'
  | 'selectedNodeIds'
  | 'pickColumn'
  | 'pickAll'
  | 'reset'
  | 'resetRequest'
  | 'onRowHover'
  | 'focusRow'
  | 'rowIndexOf'
  | 'markedNodeId'
>;

/**
 * Ticks and the filter, kept with the population they were made over, and the
 * cells they leave for the view beside the table: the ticked ones, else the
 * filter's rows. As the results' tables do. Nothing without `cells`.
 */
function useTableCells({
  cells,
  population,
  ready,
  rowCount,
  getFilteredIndices,
  getRowIndex,
}: {
  cells: TableCells | undefined;
  population: string;
  ready: boolean;
  rowCount: number;
  getFilteredIndices: (filter: FilterModel) => Promise<Uint32Array | null>;
  getRowIndex: ReturnType<typeof useNodesWorker>['getRowIndex'];
}): GridSelection | undefined {
  const selectable = cells !== undefined;
  const onShownCellsChange = cells?.onShownCellsChange;
  const [ticks, setTicks] = useState<{ population: string; cells: ReadonlySet<number> }>();
  const [filter, setFilter] = useState<{ population: string; model: FilterModel }>();
  const ticked = ticks?.population === population ? ticks.cells : NO_TICKS;
  const filterModel = filter?.population === population ? filter.model : EMPTY_FILTER;

  // The rows the filter keeps, once the session has the population.
  const [rows, setRows] = useState<{
    population: string;
    filter: FilterModel;
    indices: Uint32Array | null;
  }>();
  useEffect(() => {
    if (!selectable || !ready || !population) return;
    let cancelled = false;
    getFilteredIndices(filterModel)
      .then((indices) => {
        if (!cancelled) setRows({ population, filter: filterModel, indices });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectable, ready, population, filterModel, getFilteredIndices]);
  const currentRows = rows?.population === population && rows.filter === filterModel ? rows : null;

  // The ticked cells, else the filter's settled rows; until those settle, nothing new is said.
  const shown = useMemo(() => {
    if (ticked.size > 0) return Uint32Array.from([...ticked].sort((a, b) => a - b));
    return currentRows ? currentRows.indices : undefined;
  }, [ticked, currentRows]);
  useEffect(() => {
    if (shown !== undefined && population) {
      onShownCellsChange?.({ population, cells: shown, rowCount });
    }
  }, [shown, population, rowCount, onShownCellsChange]);

  const toggleTick = useCallback(
    (nodeId: number) => {
      setTicks((previous) => {
        const next = new Set(previous?.population === population ? previous.cells : NO_TICKS);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return { population, cells: next };
      });
    },
    [population]
  );
  if (!cells) return undefined;

  // The tick atop the column takes every row the filter keeps, or lets them all go.
  const tableRows = currentRows?.indices;
  let tickedInTable = 0;
  if (tableRows) for (const row of tableRows) tickedInTable += ticked.has(row) ? 1 : 0;
  else for (const cell of ticked) tickedInTable += cell < rowCount ? 1 : 0;
  const rowsInTable = tableRows ? tableRows.length : rowCount;
  const tickAllState =
    tickedInTable === 0 ? 'none' : tickedInTable === rowsInTable ? 'all' : 'some';
  const toggleTickAll = () => {
    setTicks((previous) => {
      const next = new Set(previous?.population === population ? previous.cells : NO_TICKS);
      const every = tableRows ?? Array.from({ length: rowCount }, (_, i) => i);
      if (tickAllState === 'all') for (const row of every) next.delete(row);
      else for (const row of every) next.add(row);
      return { population, cells: next };
    });
  };

  return {
    onFilterModelChange: (model) => setFilter({ population, model }),
    initialFilterModel: filterModel,
    // A grid kept through a switch of population takes that population's filters.
    filterScope: population,
    onRowClick: toggleTick,
    selectedNodeIds: ticked,
    pickColumn: true,
    pickAll: { state: tickAllState, onToggle: toggleTickAll },
    reset: { picked: ticked.size > 0, onReset: () => setTicks(undefined) },
    resetRequest: cells.resetRequest,
    onRowHover: cells.onHoveredCellChange,
    focusRow: cells.focusedCell,
    rowIndexOf: getRowIndex,
    markedNodeId: cells.heldCell,
  };
}

function renderBody({
  configError,
  configLoading,
  workerError,
  workerLoading,
  downloadProgress,
  hasPopulation,
  columns,
  rowCount,
  filteredCount,
  datasource,
  visibleColumns,
  setVisibleColumns,
  selection,
}: {
  configError: Error | null;
  configLoading: boolean;
  workerError: Error | null;
  workerLoading: boolean;
  downloadProgress: ReturnType<typeof useNodesWorker>['progress'];
  hasPopulation: boolean;
  columns: ReturnType<typeof useNodesWorker>['columns'];
  rowCount: number;
  filteredCount: number | null;
  datasource: ReturnType<typeof useNodesWorker>['datasource'];
  visibleColumns: Set<string>;
  setVisibleColumns: (next: Set<string>) => void;
  selection: GridSelection | undefined;
}) {
  if (configError) {
    return (
      <div className={styles.centered}>
        <GenericError
          content={
            <>
              Could not load circuit configuration
              <span className="mt-2 block text-base opacity-80">{configError.message}</span>
            </>
          }
        />
      </div>
    );
  }
  if (configLoading) return <CenteredSpin label="Loading circuit configuration…" />;
  if (!hasPopulation) {
    return <Empty description="No node populations available" />;
  }
  if (workerError) {
    return (
      <div className={styles.centered}>
        <GenericError
          content={
            <>
              Could not load nodes dataset
              <span className="mt-2 block text-base opacity-80">{workerError.message}</span>
            </>
          }
        />
      </div>
    );
  }
  if (workerLoading || !columns || !datasource) {
    return <DownloadProgress progress={downloadProgress} />;
  }
  return (
    <NodesGrid
      columns={columns}
      rowCount={rowCount}
      filteredCount={filteredCount}
      datasource={datasource}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      {...selection}
    />
  );
}

function CenteredSpin({ label }: { label: string }) {
  return (
    <div className={styles.centered}>
      <Spin tip={label} size="large" className="[&_.ant-spin-dot-item]:bg-primary-6!">
        <div className={styles.spinBox} />
      </Spin>
    </div>
  );
}

function DownloadProgress({
  progress,
}: {
  progress: ReturnType<typeof useNodesWorker>['progress'];
}) {
  // No bytes yet (or no Content-Length to compute a percent): fall back to the indeterminate spinner.
  if (!progress) return <CenteredSpin label="Loading nodes…" />;
  if (!progress.total) {
    return <CenteredSpin label={`Downloading nodes… ${formatBytes(progress.received, 0)}`} />;
  }

  const percent = Math.round((progress.received / progress.total) * 100);
  return (
    <div className={styles.centered}>
      <div style={{ width: 280 }} className="text-center">
        <div className="mb-1 text-sm text-primary-9">
          Downloading nodes…{' '}
          <span className="tabular-nums">
            {formatBytes(progress.received, 0)} / {formatBytes(progress.total, 0)}
          </span>
        </div>
        <Progress
          type="line"
          percent={percent}
          strokeColor="var(--color-primary-6)"
          className="[&_.ant-progress-text]:text-primary-9!"
        />
      </div>
    </div>
  );
}
