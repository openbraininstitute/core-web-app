'use client';

import { Empty, Progress, Spin } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { NodesToolbar } from '@/features/circuit-nodes/components/nodes-toolbar';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useTableTicks } from '@/features/circuit-nodes/hooks/use-table-ticks';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import { GenericError } from '@/ui/molecules/generic-error';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/** The cells a 3D view beside the table shows, as the table narrows them, and what it points out. */
export type TableCells = {
  /**
   * Told the cells to show, by node index, once the table has them: the ticked
   * ones, else the rows its filter keeps; null for every cell. Named with the
   * circuit and population they are of, so another circuit's never apply.
   */
  onShownCellsChange: (shown: {
    circuitId: string;
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
  // Ticks and the filter, kept with the circuit and population they were made
  // over, and the cells they leave for the view beside the table.
  const scope = population ? `${circuit.id}/${population.name}` : '';
  const ticks = useTableTicks({
    scope,
    // A table with no view beside it asks nothing more of the session.
    ready: cells !== undefined && status === 'ready',
    rowCount,
    getFilteredIndices,
  });
  const { shown, filterError } = ticks;
  const onShownCellsChange = cells?.onShownCellsChange;
  useEffect(() => {
    if (shown === undefined || !population) return;
    onShownCellsChange?.({
      circuitId: circuit.id,
      population: population.name,
      cells: shown,
      rowCount,
    });
  }, [shown, circuit.id, population, rowCount, onShownCellsChange]);
  const selection: GridSelection | undefined = cells && {
    onFilterModelChange: ticks.setFilterModel,
    initialFilterModel: ticks.filterModel,
    // A grid kept through a switch of circuit or population takes that scope's filters.
    filterScope: scope,
    onRowClick: ticks.toggleTick,
    selectedNodeIds: ticks.ticked,
    pickColumn: true,
    pickAll: ticks.pickAll,
    reset: { picked: ticks.ticked.size > 0, onReset: ticks.clearTicks },
    resetRequest: cells.resetRequest,
    onRowHover: cells.onHoveredCellChange,
    focusRow: cells.focusedCell,
    rowIndexOf: getRowIndex,
    markedNodeId: cells.heldCell,
    headerExtra: filterError && (
      <span className="whitespace-nowrap text-xs text-amber-700" title={filterError.message}>
        The 3D view could not follow this filter, so it shows every neuron
      </span>
    ),
  };

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
  | 'headerExtra'
>;

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
