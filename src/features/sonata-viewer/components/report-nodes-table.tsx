'use client';

import { Empty, Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  KeptNodesGrid,
  KeptNodesGridPlaceholder,
} from '@/features/circuit-nodes/components/kept-nodes-grid';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';

import type { IDatasource } from 'ag-grid-community';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  PickAllState,
  PinnedColumn,
  QuickFilter,
} from '@/features/circuit-nodes/components/nodes-grid';
import type {
  ColumnMeta,
  FilterModel,
  ParsedCircuitConfig,
  SortItem,
} from '@/features/circuit-nodes/types';
import type { PopulationMetadata } from '@/features/sonata-viewer/types';

/** This table's owner name in the shared nodes session, beside any spike statistics. */
const OWNER = 'voltage-report';
const RECORDED_COLUMN = 'report:recorded';

/** Merged into every read, so the grid only ever pages the cells the report recorded. */
const RECORDED_ONLY: FilterModel = {
  [RECORDED_COLUMN]: { filterType: 'number', type: 'equals', filter: '1' },
};

const NO_FILTER: FilterModel = {};
const NO_EXTRA_COLUMNS: ColumnMeta[] = [];

/**
 * The filter, tagged with its session: every table over the same cells - the
 * viewer's own, the one beside its statistics, the next simulation's - starts
 * from it.
 */
const filterAtom = atom<{ session: string; model: FilterModel } | undefined>(undefined);

type Props = {
  circuit: ICircuit;
  circuitConfig: ParsedCircuitConfig | undefined;
  population: PopulationMetadata;
  /** The traces whose cells pass the table's filter, in trace order; null when it filters nothing. */
  onVisibleTracesChange: (traceIndices: number[] | null) => void;
  /** A row was clicked, by its cell's node id. */
  onCellClick: (nodeId: number) => void;
  /** Rows drawn as ticked: the cells picked to draw. */
  selectedNodeIds: ReadonlySet<number>;
  /** The tick atop the tick column, for every row the table shows at once. */
  pickAll?: { state: PickAllState; onToggle: () => void };
  /** Said beside the count above the rows. */
  note?: string | null;
  /** Columns the host registered in the session, listed ahead of the file's. */
  extraColumns?: ColumnMeta[];
  /** The cell under the pointer, by node id; null once it leaves the table. */
  onCellHover?: (nodeId: number | null) => void;
  /** Statistics the host registered in the session, pinned against the table's right edge. */
  pinnedColumns?: readonly PinnedColumn[];
  /** Changes whenever the pinned columns' values do, so their cells are drawn again. */
  pinnedVersion?: unknown;
  onPinnedResize?: (width: number) => void;
  quickFilters?: readonly QuickFilter[];
  reset?: { picked: boolean; onReset: () => void };
  /** A cell to bring into view, such as one clicked in a scene; a new key asks again. */
  focusRow?: { nodeId: number; key: number };
};

/**
 * The report's recorded cells as rows of the circuit's nodes table, every node
 * property alongside.
 *
 * Filtering it is how the plot above chooses its cells, and clicking a row
 * ticks one to draw. The rows come from the circuit's own node file, through
 * the session its other viewers share, with a derived column marking which
 * cells the report recorded.
 */
export function ReportNodesTable({
  circuit,
  circuitConfig,
  population,
  onVisibleTracesChange,
  onCellClick,
  selectedNodeIds,
  pickAll,
  onCellHover,
  note,
  extraColumns = NO_EXTRA_COLUMNS,
  pinnedColumns,
  pinnedVersion,
  onPinnedResize,
  quickFilters,
  reset,
  focusRow,
}: Props) {
  const nodePopulation = circuitConfig?.nodes.find((n) => n.name === population.name);
  const sessionKey = nodePopulation
    ? nodesSessionKey(circuit.id, circuitConfig?.circuitAssetId ?? '', nodePopulation.name)
    : '';
  const {
    status,
    rowCount,
    filteredCount,
    columns,
    datasource,
    error,
    progress,
    setDerivedColumns,
    getFilteredIndices,
    getRowIndex,
  } = useNodesWorker({
    enabled: nodePopulation !== undefined,
    circuitId: circuit.id,
    circuitAssetId: circuitConfig?.circuitAssetId ?? '',
    population: nodePopulation,
  });
  const ready = status === 'ready';

  // Each recorded cell's traces: one, or several in a compartment report.
  const tracesOfNode = useMemo(() => {
    const map = new Map<number, number[]>();
    population.traces.forEach((trace, index) => {
      const list = map.get(trace.nodeId);
      if (list) list.push(index);
      else map.set(trace.nodeId, [index]);
    });
    return map;
  }, [population]);

  const recordedCount = useMemo(() => {
    let n = 0;
    for (const nodeId of tracesOfNode.keys()) if (nodeId >= 0 && nodeId < rowCount) n += 1;
    return n;
  }, [tracesOfNode, rowCount]);

  const registration = `${sessionKey}:${rowCount}`;
  const [registered, setRegistered] = useState<string>();
  useEffect(() => {
    if (!ready) return;
    const values = new Float64Array(rowCount).fill(Number.NaN);
    for (const nodeId of tracesOfNode.keys()) {
      if (nodeId >= 0 && nodeId < rowCount) values[nodeId] = 1;
    }
    let cancelled = false;
    setDerivedColumns(OWNER, [{ name: RECORDED_COLUMN, values }])
      .then(() => {
        if (!cancelled) setRegistered(registration);
      })
      // the session closed underneath; its next ready state sets it again
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, rowCount, tracesOfNode, setDerivedColumns, registration]);
  const recordedReady = ready && registered === registration;

  const recordedSource = useMemo<IDatasource | null>(() => {
    if (!datasource || !recordedReady) return null;
    return {
      rowCount: recordedCount,
      getRows: (params) =>
        datasource.getRows({
          ...params,
          filterModel: { ...(params.filterModel ?? {}), ...RECORDED_ONLY },
        }),
    };
  }, [datasource, recordedReady, recordedCount]);

  // Columns the host added - the config's neuron sets - ahead of the file's.
  const tableColumns = useMemo(
    () => (columns && extraColumns.length > 0 ? [...extraColumns, ...columns] : columns),
    [columns, extraColumns]
  );

  // A population gets a grid of its own, whose filters start empty; so does this.
  const [filter, setFilter] = useAtom(filterAtom);
  const filterModel = filter?.session === sessionKey ? filter.model : NO_FILTER;
  const filtering = Object.keys(filterModel).length > 0;

  useEffect(() => {
    if (!recordedReady) return;
    if (!filtering) {
      onVisibleTracesChange(null);
      return;
    }
    let cancelled = false;
    getFilteredIndices({ ...filterModel, ...RECORDED_ONLY })
      .then((nodeIds) => {
        if (cancelled) return;
        const traces: number[] = [];
        for (const nodeId of nodeIds ?? []) traces.push(...(tracesOfNode.get(nodeId) ?? []));
        traces.sort((a, b) => a - b);
        onVisibleTracesChange(traces);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    recordedReady,
    filtering,
    filterModel,
    getFilteredIndices,
    tracesOfNode,
    onVisibleTracesChange,
  ]);

  // Where a cell falls among the recorded rows, not among the whole file's.
  const rowAmongRecorded = useCallback(
    (nodeId: number, sort: SortItem[], model: FilterModel) =>
      getRowIndex(nodeId, sort, { ...model, ...RECORDED_ONLY }),
    [getRowIndex]
  );

  if (!circuitConfig) {
    return (
      <KeptNodesGridPlaceholder
        fallback={
          <Centered>
            <Spin />
          </Centered>
        }
      />
    );
  }
  if (!nodePopulation) {
    return (
      <Centered>
        <Empty
          description={`The circuit has no node file for “${population.name}”, so its cells cannot be listed.`}
        />
      </Centered>
    );
  }
  if (error) {
    return (
      <Centered>
        <Empty description={`The circuit’s nodes could not be read: ${error.message}`} />
      </Centered>
    );
  }
  if (!recordedSource || !columns) {
    const percent =
      progress?.total && progress.total > 0
        ? ` ${Math.round((progress.received / progress.total) * 100)}%`
        : '';
    // The table kept from the view before, over the same cells, until this one's is ready.
    return (
      <KeptNodesGridPlaceholder
        session={sessionKey}
        fallback={
          <Centered>
            <Spin tip={`Loading the circuit’s nodes…${percent}`}>
              <div className="size-12" />
            </Spin>
          </Centered>
        }
      />
    );
  }

  return (
    <KeptNodesGrid
      session={sessionKey}
      filterScope="voltage"
      columns={tableColumns ?? columns}
      rowCount={recordedCount}
      filteredCount={filtering ? filteredCount : null}
      datasource={recordedSource}
      onFilterModelChange={(model) => setFilter({ session: sessionKey, model })}
      initialFilterModel={filterModel}
      pinnedColumns={pinnedColumns}
      pinnedVersion={pinnedVersion}
      onPinnedResize={onPinnedResize}
      quickFilters={quickFilters}
      reset={reset}
      focusRow={focusRow}
      rowIndexOf={rowAmongRecorded}
      onRowClick={onCellClick}
      selectedNodeIds={selectedNodeIds}
      pickColumn
      pickAll={pickAll}
      onRowHover={onCellHover}
      headerNote={note}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
