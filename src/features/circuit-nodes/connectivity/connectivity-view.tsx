'use client';

import { RiCloseLine } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CenteredSpin, DownloadProgress } from '@/features/circuit-nodes/components/loading';
import {
  connectivityFigure,
  MEASURES,
  pathwayName,
} from '@/features/circuit-nodes/connectivity/connectivity-figure';
import {
  defaultGrouping,
  lineMembers,
  sameSquare,
  sameWindow,
  selectionApplies,
  sideWindow,
  squareOf,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import {
  nodeColumnOptions,
  nodeProperty,
} from '@/features/circuit-nodes/connectivity/node-properties';
import {
  useConnectivityDownloadGate,
  useConnectivityMatrix,
} from '@/features/circuit-nodes/connectivity/use-connectivity';
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
  NodeProperty,
  SideWindow,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityEntry } from '@/features/circuit-nodes/connectivity/use-connectivity';
import type { MatrixPin } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';
import type { HoverPoint, PlotRanges } from '@/features/spike-viewer/spike-statistics/figures';

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
/** The most rows or columns in view: past it, neurons next in the order, or values, share one. */
const MAX_ROWS = 300;
/** How long a click waits to see if it is half of a double click, as long as Plotly gives one. */
const DOUBLE_CLICK_MS = 300;

function requestOf(groupBy: string, orderBy: string): ConnectivityRequest {
  return groupBy === BY_NEURON
    ? { by: 'neuron', orderBy: orderBy === MATRIX_ORDER ? null : orderBy, maxRows: MAX_ROWS }
    : { by: 'property', property: groupBy, maxRows: MAX_ROWS };
}

/** A pathway of the matrix: the node ids of the neurons it starts from, and of those it ends at. */
export type MatrixPathway = { pre: Uint32Array; post: Uint32Array };

/** The node file's columns, read in the table's own session, to group the matrix by. */
export type NodeColumns = {
  columns: readonly ColumnMeta[];
  getColumn: (name: string) => Promise<ColumnValues>;
};

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

/** What each row and column holds, while neurons, or a property's values, share them. */
function sharingNote({ by, pre, post }: ConnectivityGroups, axis: string): string | null {
  if (pre.step === 1 && post.step === 1) return null;
  const [one, many, single] =
    by === 'neuron'
      ? ['one neuron', 'neurons', 'neurons']
      : [`one ${axis} value`, `${axis} values`, 'values'];
  const of = (n: number) => (n === 1 ? one : `${n.toLocaleString()} ${many}`);
  const each =
    pre.step === post.step
      ? `Each row and column is ${of(pre.step)}`
      : `Each row is ${of(pre.step)} and each column ${of(post.step)}`;
  return `${each}. Zoom in for single ${single}`;
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
    <span className="flex items-center gap-2">
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
        <RiCloseLine className="size-4" />
      </button>
    </span>
  );
}

/** That the table and the view beside it keep to a pathway clicked, and the way back. */
function PinnedNote({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onClear}
        title="Stop filtering to this pathway"
        aria-label="Stop filtering to this pathway"
        className={ROUND_PILL_CLASS}
      >
        <RiCloseLine className="size-4" />
      </button>
      <span
        className={cn(
          PILL_CLASS,
          'min-w-0 font-normal whitespace-nowrap text-neutral-500 hover:bg-white'
        )}
      >
        Filtered to
        <strong className="text-primary-9 min-w-0 truncate font-semibold" title={name}>
          {name}
        </strong>
      </span>
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
  nodeColumns,
  onPathwayChange,
  pin,
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
  /** The columns of the table's node file, offered to group by where it is the matrix's. */
  nodeColumns?: NodeColumns;
  /**
   * Told the pathway under the pointer, null once it leaves the matrix: only for a
   * matrix of the selection's population, whose neurons a view beside it draws.
   */
  onPathwayChange?: (pathway: MatrixPathway | null) => void;
  /** Given, a square clicked pins its pathway: only for a matrix of the selection's population. */
  pin?: MatrixPin;
  headerSlot: HTMLElement | null;
}) {
  // A matrix past what the browser can hold is never asked for, and a large one only once
  // the user has seen its size and said to.
  const tooLarge = entry?.size != null && entry.size > MAX_ASSET_BYTES;
  const gate = useConnectivityDownloadGate(circuitId, assetId, tooLarge ? undefined : entry);
  const matrix = useConnectivityMatrix(
    circuitId,
    assetId,
    tooLarge || gate.waiting ? undefined : entry
  );
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
  if (gate.checking) return <CenteredSpin label="Loading the connectivity matrix…" />;
  if (gate.waiting) {
    return (
      <div className={cn(styles.centered, 'flex-col gap-3 text-center text-sm text-neutral-500')}>
        <span className="text-primary-9 font-semibold">
          {entry.size == null
            ? "This matrix's size could not be read"
            : `This matrix is ${formatBytes(entry.size, 1)}`}
        </span>
        <span>It downloads to this browser, which keeps it for next time.</span>
        <button type="button" className={PILL_CLASS} onClick={gate.allow}>
          Download
        </button>
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
      nodeColumns={nodeColumns}
      onPathwayChange={onPathwayChange}
      pin={pin}
      headerSlot={headerSlot}
    />
  );
}

function ReadyMatrix({
  summary,
  edgePopulation,
  group,
  selection,
  nodeColumns,
  onPathwayChange,
  pin,
  headerSlot,
}: {
  summary: ConnectivitySummary;
  edgePopulation: string;
  group: (
    request: ConnectivityRequest,
    cells: Uint32Array | null,
    outside: NodeProperty[]
  ) => Promise<ConnectivityGroups>;
  selection: MatrixSelection | undefined;
  nodeColumns: NodeColumns | undefined;
  onPathwayChange: ((pathway: MatrixPathway | null) => void) | undefined;
  pin: MatrixPin | undefined;
  headerSlot: HTMLElement | null;
}) {
  const categorical = summary.properties.filter((p) => p.kind === 'categorical');
  const initial = defaultGrouping(summary.properties);
  const [groupBy, setGroupBy] = useState(initial ?? BY_NEURON);
  const [orderBy, setOrderBy] = useState(initial ?? MATRIX_ORDER);
  const [measure, setMeasure] = useState<ConnectivityMeasure>('probability');
  const request = useMemo(() => requestOf(groupBy, orderBy), [groupBy, orderBy]);

  // The table's population is the matrix's: its selection, where it is some of the neurons,
  // narrows the matrix, and a pathway's neurons are those the 3D view beside it draws.
  const ofTable =
    !!selection &&
    selectionApplies({
      edgePopulation,
      nodePopulation: selection.population,
      rowCount: selection.rowCount,
      neurons: summary.neurons,
    });
  // A pathway pinned narrows what is beside the matrix, not the matrix, which stays as it was.
  const pinned = ofTable ? (pin?.pinned ?? null) : null;
  const selected =
    ofTable && selection.cells && selection.cells.length < selection.rowCount
      ? selection.cells
      : null;
  const cells = pinned ? pinned.matrixCells : selected;
  const pathwayTo = ofTable ? onPathwayChange : undefined;
  const neurons = cells ? cells.length : summary.neurons;

  // The node file's other columns, where the table's file is the matrix's, read once each.
  const fromNodes = useMemo(
    () =>
      ofTable && nodeColumns
        ? nodeColumnOptions(nodeColumns.columns, new Set(categorical.map((p) => p.name)))
        : [],
    [ofTable, nodeColumns, categorical]
  );
  const [outside, setOutside] = useState<Record<string, NodeProperty | Error>>({});
  const wanted = [groupBy, groupBy === BY_NEURON ? orderBy : null].filter(
    (name): name is string => !!name && fromNodes.some((c) => c.name === name)
  );
  const missing = wanted.filter((name) => !outside[name]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: asked for once per column missing
  useEffect(() => {
    if (!nodeColumns) return;
    for (const name of missing) {
      nodeColumns
        .getColumn(name)
        .then((column) => nodeProperty(name, column))
        .catch((error: unknown) => (error instanceof Error ? error : new Error(String(error))))
        .then((read) => setOutside((known) => ({ ...known, [name]: read })));
    }
  }, [missing.join('|')]);
  const outsideError = wanted
    .map((name) => outside[name])
    .find((read): read is Error => read instanceof Error);
  const outsideProperties = wanted
    .map((name) => outside[name])
    .filter((read): read is NodeProperty => !!read && !(read instanceof Error));
  const requestKey = `${JSON.stringify(request)}/${selectionId(cells)}/${missing.length}`;

  // What of each side is in view, kept with the matrix it is of.
  const [zoom, setZoom] = useState<{
    key: string;
    window: { pre: SideWindow; post: SideWindow };
  } | null>(null);
  const zoomedTo = zoom?.key === requestKey ? zoom.window : null;

  // Kept with the request it answers, so a change never draws the last one's rows. Another zoom
  // of the same matrix leaves the last one's up, stretched by the plot, until its lines come.
  const [answer, setAnswer] = useState<{
    key: string;
    groups?: ConnectivityGroups;
    error?: Error;
  } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the keys say what the answer is to
  useEffect(() => {
    if (missing.length > 0) return;
    let live = true;
    group(zoomedTo ? { ...request, window: zoomedTo } : request, cells, outsideProperties)
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
  }, [group, requestKey, JSON.stringify(zoomedTo)]);
  const current = answer?.key === requestKey ? answer : null;

  const zoomMatrix = ({ x, y }: PlotRanges) => {
    const places = current?.groups?.places;
    if (places === undefined) return;
    const whole = sideWindow([-0.5, places - 0.5], places, MAX_ROWS);
    const pre = sideWindow(y, places, MAX_ROWS);
    const post = sideWindow(x, places, MAX_ROWS);
    setZoom(
      sameWindow(pre, whole) && sameWindow(post, whole)
        ? null
        : { key: requestKey, window: { pre, post } }
    );
  };

  // The pathway under the pointer, told once per cell, and let go of with the rows it was of.
  // Told through the latest callback, which a host may make anew on each render.
  const hoveredRef = useRef<string | null>(null);
  const pathwayToRef = useRef(pathwayTo);
  useLayoutEffect(() => {
    pathwayToRef.current = pathwayTo;
  });
  // Pinned, a pathway stays coloured beside the matrix, whatever is under the pointer.
  useEffect(() => {
    if (!pinned) return;
    // The pin took over what the hover told: a regroup must not let go of it.
    hoveredRef.current = null;
    pathwayToRef.current?.({ pre: pinned.pre, post: pinned.post });
    return () => pathwayToRef.current?.(null);
  }, [pinned]);
  const hoverPathway = (point: HoverPoint | null) => {
    if (pinned) return;
    const groups = current?.groups;
    const [pre, post] = point && Array.isArray(point.pointNumber) ? point.pointNumber : [];
    const key = groups && pre !== undefined && post !== undefined ? `${pre}/${post}` : null;
    if (key === hoveredRef.current) return;
    hoveredRef.current = key;
    pathwayToRef.current?.(
      groups && key
        ? { pre: lineMembers(groups.pre, pre), post: lineMembers(groups.post, post) }
        : null
    );
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: let go with the rows it was of
  useEffect(
    () => () => {
      if (hoveredRef.current === null) return;
      hoveredRef.current = null;
      pathwayToRef.current?.(null);
    },
    [current]
  );

  const pinnedSquare = pinned?.square.matrix === requestKey ? pinned.square : null;
  const pinPathway = (point: HoverPoint) => {
    const groups = current?.groups;
    const [pre, post] = Array.isArray(point.pointNumber) ? point.pointNumber : [];
    if (!pin || !groups || pre === undefined || post === undefined) return;
    const square = squareOf(groups, pre, post);
    if (pinnedSquare && sameSquare(pinnedSquare, square)) {
      pin.onPick(null);
      return;
    }
    pin.onPick({
      pre: lineMembers(groups.pre, pre),
      post: lineMembers(groups.post, post),
      square: { ...square, matrix: requestKey },
      name: pathwayName(groups, pre, post),
      matrixCells: cells,
    });
  };
  const pickable = ofTable && pin !== undefined;
  // A double click zooms out, and neither of its presses is a pick: Plotly tells the first as a
  // click before it, and the second as a click after it.
  const pickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const doubleClickedAt = useRef(Number.NEGATIVE_INFINITY);
  const pickAfterClick = (point: HoverPoint) => {
    clearTimeout(pickTimer.current);
    if (performance.now() - doubleClickedAt.current < DOUBLE_CLICK_MS) return;
    pickTimer.current = setTimeout(() => pinPathway(point), DOUBLE_CLICK_MS);
  };
  const dropPick = () => {
    clearTimeout(pickTimer.current);
    doubleClickedAt.current = performance.now();
  };
  useEffect(() => () => clearTimeout(pickTimer.current), []);

  const byNeuron = groupBy === BY_NEURON;
  const axis = byNeuron ? `neurons${orderBy === MATRIX_ORDER ? '' : ` by ${orderBy}`}` : groupBy;
  const figure = useMemo(
    () =>
      current?.groups &&
      connectivityFigure({
        groups: current.groups,
        measure,
        axis,
        pinned: pinnedSquare,
        pickable,
        revision: requestKey,
      }),
    [current, measure, axis, pinnedSquare, pickable, requestKey]
  );
  const sharing = current?.groups ? sharingNote(current.groups, axis) : null;
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
              connections={current?.groups?.totals.connections}
              synapses={current?.groups?.totals.synapses}
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
      <div className="flex items-start gap-2 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <PillSelect
            label="Group by"
            value={groupBy}
            onChange={(value) => {
              setGroupBy(value);
              // A neuron to a neuron is connected or not: how many synapses says more.
              if (value === BY_NEURON && neurons <= MAX_ROWS && measure === 'probability') {
                setMeasure(summary.synapses === null ? 'connections' : 'synapses');
              }
            }}
            options={[
              ...categorical.map((p) => ({
                value: p.name,
                label: p.name,
                detail: `${p.values?.length ?? 0}`,
              })),
              ...fromNodes.map((c) => ({
                value: c.name,
                label: c.name,
                detail: c.ranges ? 'ranges' : undefined,
              })),
              {
                // no grouping: a row per neuron
                value: BY_NEURON,
                label: 'None',
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
                ...fromNodes.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
          )}
          <PillSelect
            label="Show"
            value={measure}
            onChange={(value) => setMeasure(value as ConnectivityMeasure)}
            options={measures.map((m) => ({ value: m.value, label: m.label }))}
          />
          {sharing && (
            <span
              className="text-xs text-neutral-400"
              title={
                byNeuron
                  ? 'Too many neurons in view for a row each, so neurons next to each other in the Order by order share one. Zooming in counts the matrix again, down to one neuron a row.'
                  : 'Too many values in view for a row each, so values next to each other share one. Zooming in counts the matrix again, down to one value a row.'
              }
            >
              {sharing}
            </span>
          )}
        </div>
        {((cells && selection) || (pinned && pin)) && (
          <span className="flex max-w-[60%] min-w-0 shrink-0 items-center gap-2">
            {cells && selection && (
              <SelectionNote
                count={cells.length}
                total={summary.neurons}
                onReset={selection.onReset}
              />
            )}
            {pinned && pin && <PinnedNote name={pinned.name} onClear={() => pin.onPick(null)} />}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {current?.error || outsideError ? (
          <div className={styles.centered}>
            <GenericError content={(outsideError ?? current?.error)?.message} />
          </div>
        ) : cells?.length === 0 ? (
          <Empty description="None of the matrix's neurons are selected" />
        ) : figure ? (
          <StatisticsPlot
            figure={figure}
            onPointHover={pathwayTo && hoverPathway}
            onPointClick={pickable ? pickAfterClick : undefined}
            onPointDoubleClick={pickable ? dropPick : undefined}
            onRangesChange={zoomMatrix}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spin />
          </div>
        )}
      </div>
    </div>
  );
}
