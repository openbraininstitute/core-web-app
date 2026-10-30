'use client';

import { RiAddLine } from '@remixicon/react';
import { Empty } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CenteredSpin, DownloadProgress } from '@/features/circuit-nodes/components/loading';
import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { NodesToolbar } from '@/features/circuit-nodes/components/nodes-toolbar';
import { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import {
  connectivityAsset,
  useConnectivityEntries,
} from '@/features/circuit-nodes/connectivity/use-connectivity';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useTableTicks } from '@/features/circuit-nodes/hooks/use-table-ticks';
import { neuronSetBlock } from '@/features/circuit-nodes/neuron-set-block';
import { resolvePopulation } from '@/features/circuit-nodes/population-utils';
import { GenericError } from '@/ui/molecules/generic-error';
import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NeuronSetBlock } from '@/features/circuit-nodes/neuron-set-block';
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
  /**
   * Given, the neurons on show, while they are neither all of them nor none, can be made a
   * neuron set: a property set where their values say exactly which they are, else their ids.
   */
  onCreateNeuronSet?: (block: NeuronSetBlock) => void;
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

  const [chosenView, setView] = useState<ViewMode>('nodes');
  // A circuit without a matrix, such as the next one shown here, has its nodes on show.
  const view = chosenView === 'connectivity' && !connectivityAsset(circuit) ? 'nodes' : chosenView;
  const [internalPopulationName, setInternalPopulationName] = useState<string | undefined>();
  const connectivity = useConnectivityEntries(circuit, view === 'connectivity');
  const [edgePopulation, setEdgePopulation] = useState<string | undefined>();
  const matrix =
    connectivity.entries?.find((e) => e.population === edgePopulation) ?? connectivity.entries?.[0];

  const isControlled = onPopulationChange !== undefined;
  const selectedPopulationName = isControlled ? controlledPopulationName : internalPopulationName;
  const setSelectedPopulationName = isControlled ? onPopulationChange : setInternalPopulationName;

  const population = useMemo(
    () => (config ? resolvePopulation(config.nodes, selectedPopulationName) : undefined),
    [config, selectedPopulationName]
  );

  // Kept open beside the matrix, so the table and its ticks are as they were on the way back.
  const enabled = view !== 'edges';

  const {
    rowCount,
    filteredCount,
    columns,
    datasource,
    status,
    getColumn,
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
  const { shown, filterError, clearTicks, setFilterModel } = ticks;
  // Every neuron on show again, the way the grid's reset does it, for a view in the grid's place.
  const resetSelection = () => {
    clearTicks();
    setFilterModel({});
  };
  // A reset asked for from the 3D view goes to the grid, which is not up beside the matrix.
  const resetRequest = cells?.resetRequest;
  const seenResetRef = useRef(resetRequest);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new request resets
  useEffect(() => {
    if (resetRequest === seenResetRef.current) return;
    seenResetRef.current = resetRequest;
    if (resetRequest && view === 'connectivity') resetSelection();
  }, [resetRequest]);
  // The neurons on show as a neuron set, where they are some but not all of them.
  const [makingSet, setMakingSet] = useState(false);
  const onCreateNeuronSet = cells?.onCreateNeuronSet;
  const setOfShown =
    onCreateNeuronSet &&
    population &&
    columns &&
    shown &&
    shown.length > 0 &&
    shown.length < rowCount
      ? () => {
          setMakingSet(true);
          neuronSetBlock({
            population,
            cells: shown,
            rowCount,
            ticked: ticks.ticked.size > 0,
            filterModel: ticks.filterModel,
            columns,
            getColumn,
          })
            .then(({ block }) => onCreateNeuronSet(block))
            .catch((error: unknown) =>
              logError('The neurons on show could not be made a neuron set:', error)
            )
            .finally(() => setMakingSet(false));
        }
      : undefined;
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
  // The grid's count and buttons go up into the toolbar, beside the population.
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
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
        connectivity={!!connectivity.asset}
        populations={
          view === 'connectivity'
            ? (connectivity.entries ?? []).map((e) => ({ name: e.population }))
            : (config?.nodes ?? [])
        }
        populationName={view === 'connectivity' ? matrix?.population : population?.name}
        onPopulationChange={view === 'connectivity' ? setEdgePopulation : setSelectedPopulationName}
        slotRef={setHeaderSlot}
      />
      <div className={cn(styles.body, 'relative')}>
        {view === 'connectivity' ? (
          <ConnectivityView
            circuitId={circuit.id}
            assetId={connectivity.asset?.id}
            entry={matrix}
            listing={{
              isLoading: connectivity.isLoading,
              error: connectivity.error,
              empty: connectivity.entries?.length === 0,
            }}
            selection={
              population && {
                cells: shown,
                population: population.name,
                rowCount,
                onReset: resetSelection,
              }
            }
            headerSlot={headerSlot}
          />
        ) : (
          renderBody({
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
            downloadName: population?.name,
            headerSlot,
          })
        )}
        {/* Over the rows' bottom right, while the neurons on show can be made a set. */}
        {setOfShown && view === 'nodes' && (
          <button
            type="button"
            onClick={setOfShown}
            disabled={makingSet}
            title={`Add the ${shown?.length.toLocaleString()} neurons on show as a neuron set`}
            className={cn(
              PILL_CLASS,
              'absolute right-6 bottom-6 z-20 shrink-0 bg-purple-600 text-white shadow-lg',
              'hover:bg-purple-700 disabled:opacity-60'
            )}
          >
            Create neuron set
            <RiAddLine className="size-4" />
          </button>
        )}
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
  downloadName,
  headerSlot,
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
  downloadName: string | undefined;
  headerSlot: HTMLDivElement | null;
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
    return <DownloadProgress progress={downloadProgress} what="nodes" />;
  }
  return (
    <NodesGrid
      columns={columns}
      rowCount={rowCount}
      filteredCount={filteredCount}
      datasource={datasource}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      downloadName={downloadName}
      headerSlot={headerSlot}
      {...selection}
    />
  );
}
