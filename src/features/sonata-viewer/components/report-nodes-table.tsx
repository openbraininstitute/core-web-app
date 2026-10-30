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
import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { PickAllState, PinnedColumn } from '@/features/circuit-nodes/components/nodes-grid';
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

/** Merged into every read but All's, so the grid pages the cells the report recorded. */
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

/** Which of the population's cells the table lists: the recorded ones, or every one. */
export type ReportScope = 'recorded' | 'all';

/** The scope, tagged with its session as the filter is: the next simulation's table starts from it. */
const scopeAtom = atom<{ session: string; scope: ReportScope } | undefined>(undefined);

/** The table's scope over a session's cells, the recorded ones at first, and a way to change it. */
export function useReportScope(sessionKey: string): [ReportScope, (scope: ReportScope) => void] {
  const [stored, setStored] = useAtom(scopeAtom);
  const scope = stored?.session === sessionKey ? stored.scope : 'recorded';
  const setScope = useCallback(
    (next: ReportScope) => setStored({ session: sessionKey, scope: next }),
    [sessionKey, setStored]
  );
  return [scope, setScope];
}

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
  /** Columns the host registered in the session, listed ahead of the file's. */
  extraColumns?: ColumnMeta[];
  /** The cell under the pointer, by node id; null once it leaves the table. */
  onCellHover?: (nodeId: number | null) => void;
  /** Statistics the host registered in the session, pinned against the table's right edge. */
  pinnedColumns?: readonly PinnedColumn[];
  /** Changes whenever the pinned columns' values do, so their cells are drawn again. */
  pinnedVersion?: unknown;
  /** Which cells it lists, the recorded ones where not said. */
  scope?: ReportScope;
  /** Offers the scope as a switch over the rows: Recorded | All. */
  onScopeChange?: (scope: ReportScope) => void;
  /** The rows' cells by node id, recorded or not; null while the table lists every cell of the population. */
  onRowsChange?: (nodeIds: Uint32Array | null) => void;
  /** A reset asked for from outside the table, such as the 3D view's: a new number each time. */
  resetRequest?: number;
  reset?: { picked: boolean; onReset: () => void };
  /** At the start of the header above the rows, such as the population on show. */
  headerStart?: ReactNode;
  /** Beside the count above the rows, such as the window the statistics are over. */
  headerExtra?: ReactNode;
  /** A cell to bring into view, such as one clicked in a scene; a new key asks again. */
  focusRow?: { nodeId: number; key: number };
};

/**
 * The report's recorded cells as rows of the circuit's nodes table, every node
 * property alongside; or, as its scope says, every cell of the population.
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
  extraColumns = NO_EXTRA_COLUMNS,
  pinnedColumns,
  pinnedVersion,
  scope = 'recorded',
  onScopeChange,
  onRowsChange,
  resetRequest,
  reset,
  headerStart,
  headerExtra,
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

  // The recorded cells by node id, in order: the rows while nothing else narrows them.
  const recordedNodeIds = useMemo(
    () =>
      Uint32Array.from([...tracesOfNode.keys()].filter((id) => id >= 0 && id < rowCount)).sort(),
    [tracesOfNode, rowCount]
  );
  const recordedCount = recordedNodeIds.length;
  const scopeModel = scope === 'all' ? NO_FILTER : RECORDED_ONLY;

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

  const listedSource = useMemo<IDatasource | null>(() => {
    if (!datasource || !recordedReady) return null;
    return {
      rowCount: scope === 'all' ? rowCount : recordedCount,
      getRows: (params) =>
        datasource.getRows({ ...params, filterModel: { ...params.filterModel, ...scopeModel } }),
    };
  }, [datasource, recordedReady, scope, rowCount, recordedCount, scopeModel]);

  // Columns the host added - the config's neuron sets - ahead of the file's.
  const tableColumns = useMemo(
    () => (columns && extraColumns.length > 0 ? [...extraColumns, ...columns] : columns),
    [columns, extraColumns]
  );

  // A population gets a grid of its own, whose filters start empty; so does this.
  const [filter, setFilter] = useAtom(filterAtom);
  const filterModel = filter?.session === sessionKey ? filter.model : NO_FILTER;
  const filtering = Object.keys(filterModel).length > 0;

  // The rows, and their traces: the scope and the filter both narrow them. The
  // statistics move with the traces' window, and a filter on them with it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: new pinned values are a reason to ask again
  useEffect(() => {
    if (!recordedReady) return;
    if (!filtering) {
      onVisibleTracesChange(null);
      onRowsChange?.(scope === 'all' ? null : recordedNodeIds);
      return;
    }
    let cancelled = false;
    getFilteredIndices({ ...filterModel, ...scopeModel })
      .then((nodeIds) => {
        if (cancelled) return;
        // None of the filters is on a column the session knows: every row stands.
        if (!nodeIds) {
          onVisibleTracesChange(null);
          onRowsChange?.(scope === 'all' ? null : recordedNodeIds);
          return;
        }
        const traces: number[] = [];
        for (const nodeId of nodeIds) traces.push(...(tracesOfNode.get(nodeId) ?? []));
        traces.sort((a, b) => a - b);
        onVisibleTracesChange(traces);
        onRowsChange?.(nodeIds);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    recordedReady,
    filtering,
    filterModel,
    scope,
    scopeModel,
    getFilteredIndices,
    tracesOfNode,
    recordedNodeIds,
    onVisibleTracesChange,
    onRowsChange,
    pinnedVersion,
  ]);

  // Where a cell falls among the rows the scope lists, not among the whole file's.
  const rowAmongListed = useCallback(
    (nodeId: number, sort: SortItem[], model: FilterModel) =>
      getRowIndex(nodeId, sort, { ...model, ...scopeModel }),
    [getRowIndex, scopeModel]
  );

  const scopeSwitch = useMemo(
    () =>
      onScopeChange && {
        value: scope,
        options: [
          { value: 'recorded', label: 'Recorded', title: 'The cells the report recorded' },
          {
            value: 'all',
            label: 'All',
            title: 'Every cell of the population, those not recorded drawn faint in 3D',
          },
        ],
        onChange: (value: string) => onScopeChange(value as ReportScope),
      },
    [onScopeChange, scope]
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
  if (!listedSource || !columns) {
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
      downloadName={`${population.name}-voltages`}
      columns={tableColumns ?? columns}
      rowCount={scope === 'all' ? rowCount : recordedCount}
      filteredCount={filtering ? filteredCount : null}
      datasource={listedSource}
      onFilterModelChange={(model) => setFilter({ session: sessionKey, model })}
      initialFilterModel={filterModel}
      pinnedColumns={pinnedColumns}
      pinnedVersion={pinnedVersion}
      scope={scopeSwitch}
      resetRequest={resetRequest}
      reset={reset}
      headerStart={headerStart}
      headerExtra={headerExtra}
      focusRow={focusRow}
      rowIndexOf={rowAmongListed}
      onRowClick={onCellClick}
      selectedNodeIds={selectedNodeIds}
      pickColumn
      pickAll={pickAll}
      onRowHover={onCellHover}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 items-center justify-center">{children}</div>;
}
