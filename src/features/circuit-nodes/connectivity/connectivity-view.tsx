'use client';

import { RiResetLeftLine } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { CenteredSpin, DownloadProgress } from '@/features/circuit-nodes/components/loading';
import {
  connectivityFigure,
  MEASURES,
} from '@/features/circuit-nodes/connectivity/connectivity-figure';
import {
  defaultGrouping,
  selectionApplies,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { useConnectivityMatrix } from '@/features/circuit-nodes/connectivity/use-connectivity';
import { GenericError } from '@/ui/molecules/generic-error';
import { PILL_CLASS, PillSelect, ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';
import { MAX_ASSET_BYTES } from '@/utils/h5/fs';

import type { ConnectivityMeasure } from '@/features/circuit-nodes/connectivity/connectivity-figure';
import type {
  ConnectivityGroups,
  ConnectivityRequest,
  ConnectivitySummary,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityEntry } from '@/features/circuit-nodes/connectivity/use-connectivity';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

// Plotly is megabytes; it loads the first time a matrix is drawn.
const StatisticsPlot = dynamic(
  () => import('@/features/spike-viewer/spike-statistics/statistics-plot'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Spin />
      </div>
    ),
  }
);

/** The group-by that draws the neurons one by one. */
const BY_NEURON = '__neuron';
/** The order-by that keeps the matrix's own order. */
const MATRIX_ORDER = '__matrix';
/** Neuron by neuron, the most rows: past it, neurons next in the order share one. */
const MAX_NEURON_ROWS = 300;

function requestOf(groupBy: string, orderBy: string): ConnectivityRequest {
  return groupBy === BY_NEURON
    ? {
        by: 'neuron',
        orderBy: orderBy === MATRIX_ORDER ? null : orderBy,
        maxRows: MAX_NEURON_ROWS,
      }
    : { by: 'property', property: groupBy };
}

/** The table's ticks or filter, which the matrix keeps to where they are of its neurons. */
export type MatrixSelection = {
  /** The node ids on show: null for every neuron, undefined until they are known. */
  cells: Uint32Array | null | undefined;
  /** The node population they are of, and how many neurons it has. */
  population: string;
  rowCount: number;
  /** Clears the table's ticks and filter. */
  onReset: () => void;
};

/** A number per selection, so an answer is known by the selection it was asked over. */
const selectionIds = new WeakMap<Uint32Array, number>();
let lastSelectionId = 0;
function selectionId(cells: Uint32Array | null): number {
  if (!cells) return 0;
  let id = selectionIds.get(cells);
  if (id === undefined) {
    lastSelectionId += 1;
    id = lastSelectionId;
    selectionIds.set(cells, id);
  }
  return id;
}

function sum(values: ArrayLike<number>): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total;
}

/**
 * In the toolbar's right end, as the table's count is: the neurons drawn, and
 * the connections and synapses among them where known.
 */
function Summary({
  neurons,
  of,
  connections,
  synapses,
}: {
  neurons: number;
  /** All the matrix's neurons, where only some are drawn. */
  of?: number;
  connections: number | undefined;
  synapses: number | null | undefined;
}) {
  return (
    <span className={cn(styles.gridStat, styles.gridStatStacked, 'shrink-0 text-right')}>
      <span>
        {neurons.toLocaleString()}
        {of !== undefined && ` of ${of.toLocaleString()}`} neurons
      </span>
      {connections !== undefined && (
        <span>
          {connections.toLocaleString()} connections
          {synapses != null && ` · ${synapses.toLocaleString()} synapses`}
        </span>
      )}
    </span>
  );
}

/** That only some neurons are drawn, and the way back to all of them. */
function SelectionNote({
  count,
  total,
  onReset,
}: {
  count: number;
  total: number;
  onReset: () => void;
}) {
  return (
    <span className="ml-auto flex items-center gap-2">
      <span
        className={cn(PILL_CLASS, 'font-normal whitespace-nowrap text-neutral-500 hover:bg-white')}
      >
        Only the
        <strong className="text-primary-9 font-semibold">{count.toLocaleString()}</strong>
        selected of {total.toLocaleString()} neurons
      </span>
      <button
        type="button"
        onClick={onReset}
        title="Show every neuron again"
        aria-label="Show every neuron again"
        className={ROUND_PILL_CLASS}
      >
        <RiResetLeftLine className="size-4" />
      </button>
    </span>
  );
}

/**
 * A circuit's connectivity matrix, from its `circuit_connectivity_matrices`
 * asset: connection probability, connections or synapses from each group of
 * neurons to each other, grouped by a property, or neuron by neuron in an order.
 */
export function ConnectivityView({
  circuitId,
  assetId,
  entry,
  listing,
  selection,
  headerSlot,
}: {
  circuitId: string;
  assetId: string | undefined;
  /** The matrix on show, of the edge population picked. */
  entry: ConnectivityEntry | undefined;
  /** How the asset's list of matrices is getting on. */
  listing: { isLoading: boolean; error: Error | null; empty: boolean };
  /** The neurons the table has selected, to which the matrix keeps. */
  selection?: MatrixSelection;
  headerSlot: HTMLElement | null;
}) {
  // A matrix past what the browser can hold is never asked for.
  const tooLarge = entry?.size != null && entry.size > MAX_ASSET_BYTES;
  const matrix = useConnectivityMatrix(circuitId, assetId, tooLarge ? undefined : entry);
  const { state } = matrix;

  if (listing.error) {
    return (
      <div className={styles.centered}>
        <GenericError
          content={
            <>
              Could not load the connectivity matrices
              <span className="mt-2 block text-base opacity-80">{listing.error.message}</span>
            </>
          }
        />
      </div>
    );
  }
  if (listing.isLoading) return <CenteredSpin label="Loading the connectivity matrices…" />;
  if (listing.empty || !entry) {
    return <Empty description="The circuit lists no connectivity matrix" />;
  }
  if (tooLarge) {
    return (
      <div className={cn(styles.centered, 'flex-col gap-1 text-center text-sm text-neutral-500')}>
        <span className="text-primary-9 font-semibold">
          This matrix is {formatBytes(entry.size ?? 0, 1)}
        </span>
        <span>
          More than the browser can open ({formatBytes(MAX_ASSET_BYTES, 0)}). It can still be
          downloaded from the circuit&apos;s files.
        </span>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className={cn(styles.centered, 'flex-col gap-3')}>
        <GenericError
          content={
            <>
              Could not open the connectivity matrix
              <span className="mt-2 block text-base opacity-80">{state.error.message}</span>
            </>
          }
        />
        <button type="button" className={PILL_CLASS} onClick={matrix.retry}>
          Try again
        </button>
      </div>
    );
  }
  if (state.status !== 'ready') {
    const progress = state.status === 'loading' ? state.progress : null;
    // Downloaded, it is being read: the bar has nothing more to say.
    if (progress?.total && progress.received >= progress.total) {
      return <CenteredSpin label="Reading the connectivity matrix…" />;
    }
    return <DownloadProgress progress={progress} what="the connectivity matrix" />;
  }
  return (
    <ReadyMatrix
      key={matrix.key}
      summary={state.summary}
      edgePopulation={entry.population}
      group={matrix.group}
      selection={selection}
      headerSlot={headerSlot}
    />
  );
}

function ReadyMatrix({
  summary,
  edgePopulation,
  group,
  selection,
  headerSlot,
}: {
  summary: ConnectivitySummary;
  edgePopulation: string;
  group: (request: ConnectivityRequest, cells: Uint32Array | null) => Promise<ConnectivityGroups>;
  selection: MatrixSelection | undefined;
  headerSlot: HTMLElement | null;
}) {
  const categorical = summary.properties.filter((p) => p.kind === 'categorical');
  const initial = defaultGrouping(summary.properties);
  const [groupBy, setGroupBy] = useState(initial ?? BY_NEURON);
  const [orderBy, setOrderBy] = useState(initial ?? MATRIX_ORDER);
  const [measure, setMeasure] = useState<ConnectivityMeasure>('probability');
  const request = useMemo(() => requestOf(groupBy, orderBy), [groupBy, orderBy]);

  // The table's selection, where it is some of the matrix's own neurons.
  const cells =
    selection?.cells &&
    selection.cells.length < selection.rowCount &&
    selectionApplies({
      edgePopulation,
      nodePopulation: selection.population,
      rowCount: selection.rowCount,
      neurons: summary.neurons,
    })
      ? selection.cells
      : null;
  const neurons = cells ? cells.length : summary.neurons;
  const requestKey = `${JSON.stringify(request)}/${selectionId(cells)}`;

  // Kept with the request it answers, so a change never draws the last one's rows.
  const [answer, setAnswer] = useState<{
    key: string;
    groups?: ConnectivityGroups;
    error?: Error;
  } | null>(null);
  useEffect(() => {
    let live = true;
    group(request, cells)
      .then((groups) => live && setAnswer({ key: requestKey, groups }))
      .catch((error: unknown) => {
        if (live) {
          setAnswer({
            key: requestKey,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      live = false;
    };
  }, [group, request, cells, requestKey]);
  const current = answer?.key === requestKey ? answer : null;

  const byNeuron = groupBy === BY_NEURON;
  const axis = byNeuron ? `neurons${orderBy === MATRIX_ORDER ? '' : ` by ${orderBy}`}` : groupBy;
  const figure = useMemo(
    () => current?.groups && connectivityFigure({ groups: current.groups, measure, axis }),
    [current, measure, axis]
  );
  const measures = MEASURES.filter(
    (m) =>
      summary.synapses !== null || (m.value !== 'synapses' && m.value !== 'synapsesPerConnection')
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {headerSlot &&
        createPortal(
          cells ? (
            <Summary
              neurons={neurons}
              of={summary.neurons}
              connections={current?.groups && sum(current.groups.connections)}
              synapses={current?.groups?.synapses && sum(current.groups.synapses)}
            />
          ) : (
            <Summary
              neurons={neurons}
              connections={summary.connections}
              synapses={summary.synapses}
            />
          ),
          headerSlot
        )}
      <div className="flex flex-wrap items-center gap-2 py-2">
        <PillSelect
          label="Group by"
          value={groupBy}
          onChange={(value) => {
            setGroupBy(value);
            // A neuron to a neuron is connected or not: how many synapses says more.
            if (value === BY_NEURON && neurons <= MAX_NEURON_ROWS && measure === 'probability') {
              setMeasure(summary.synapses === null ? 'connections' : 'synapses');
            }
          }}
          options={[
            ...categorical.map((p) => ({
              value: p.name,
              label: p.name,
              detail: `${p.values?.length ?? 0}`,
            })),
            {
              value: BY_NEURON,
              label: 'Neuron',
              detail: neurons.toLocaleString(),
            },
          ]}
        />
        {byNeuron && (
          <PillSelect
            label="Order by"
            value={orderBy}
            onChange={setOrderBy}
            options={[
              { value: MATRIX_ORDER, label: 'Node id' },
              ...categorical.map((p) => ({ value: p.name, label: p.name })),
            ]}
          />
        )}
        <PillSelect
          label="Show"
          value={measure}
          onChange={(value) => setMeasure(value as ConnectivityMeasure)}
          options={measures.map((m) => ({ value: m.value, label: m.label }))}
        />
        {byNeuron && neurons > MAX_NEURON_ROWS && (
          <span className="text-xs text-neutral-400">
            {Math.ceil(neurons / MAX_NEURON_ROWS).toLocaleString()} neurons or so to a row
          </span>
        )}
        {cells && selection && (
          <SelectionNote count={cells.length} total={summary.neurons} onReset={selection.onReset} />
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {current?.error ? (
          <div className={styles.centered}>
            <GenericError content={current.error.message} />
          </div>
        ) : cells?.length === 0 ? (
          <Empty description="None of the matrix's neurons are selected" />
        ) : figure ? (
          <StatisticsPlot figure={figure} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spin />
          </div>
        )}
      </div>
    </div>
  );
}
