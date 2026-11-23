import {
  lineSpan,
  possiblePairs,
  sameSquare,
  squareOf,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import {
  axisTitle,
  BASE_LAYOUT,
  compact,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data, Layout, Shape } from 'plotly.js-dist-min';
import type {
  ConnectivityGroups,
  MatrixSide,
  PathwaySquare,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { Figure, HoverPoint } from '@/features/spike-viewer/spike-statistics/figures';

export type ConnectivityMeasure =
  | 'probability'
  | 'connections'
  | 'synapses'
  | 'synapsesPerConnection';

export const MEASURES: { value: ConnectivityMeasure; label: string; unit: string }[] = [
  { value: 'probability', label: 'Connection probability', unit: '%' },
  { value: 'connections', label: 'Connections', unit: 'Connections' },
  { value: 'synapses', label: 'Synapses', unit: 'Synapses' },
  { value: 'synapsesPerConnection', label: 'Synapses per connection', unit: 'Synapses' },
];

/** Light to dark in one hue: more connected is darker. */
const SCALE: [number, string][] = [
  [0, '#deebf7'],
  [0.35, '#9ecae1'],
  [0.7, '#3182bd'],
  [1, '#08306b'],
];

const RULE = '#94a3b8';
/** Past this many rows, every few are named, or the names run into each other. */
const MAX_TICKS = 60;
/** The most values named along a side of more values than it has lines for. */
const MAX_SHARED_TICKS = 6;
/** The share of an axis a run takes to be named on it: one in this many of its rows. */
const MAX_RUN_NAMES = 25;
/** Up to this many lines, a hairline between cells keeps them apart. */
const GAPPED_ROWS = 40;
/** The most node ids named along a side. */
const MAX_NODE_ID_TICKS = 10;
/** The most rules down or across between values of the order: past it they are a solid block, and a shape each. */
const MAX_RULES = 100;

/** The value of the cell from row `pre` to `post`: NaN where it has none to give. */
export function cellValue(
  groups: ConnectivityGroups,
  measure: ConnectivityMeasure,
  pre: number,
  post: number
): number {
  const cell = pre * groups.post.labels.length + post;
  const connections = groups.connections[cell];
  const synapses = groups.synapses?.[cell] ?? Number.NaN;
  switch (measure) {
    case 'probability': {
      const pairs = possiblePairs(groups, pre, post);
      return pairs > 0 ? (100 * connections) / pairs : Number.NaN;
    }
    case 'connections':
      return connections;
    case 'synapses':
      return synapses;
    default:
      return connections > 0 ? synapses / connections : Number.NaN;
  }
}

function percent(value: number): string {
  return `${Number(value.toPrecision(3))}%`;
}

/** Round numbers of places across a stretch of them, few enough to name. */
function roundPlaces(start: number, end: number): number[] {
  const span = end - start;
  const power = 10 ** Math.floor(Math.log10(Math.max(1, span / MAX_NODE_ID_TICKS)));
  const every =
    [1, 2, 5].map((m) => m * power).find((step) => span / step <= MAX_NODE_ID_TICKS) ?? 10 * power;
  const places: number[] = [];
  for (let place = Math.ceil(start / every) * every; place < end; place += every) {
    places.push(place);
  }
  return places;
}

/**
 * Where a side is named. By a property: every line. Neuron by neuron: the middle of each value of
 * the order in view wide enough to hold its name, a narrower one being named on hover; with no
 * order, or inside one value of it, the neurons' node ids.
 */
function ticks(groups: ConnectivityGroups, side: MatrixSide) {
  const n = side.labels.length;
  if (groups.by === 'property') {
    // Past the rows' limit, a few are named, each line by its first value, as an index runs: a
    // side's lines change with the zoom, and a card names any of them exactly.
    const every = Math.ceil(
      n / (n < groups.places || side.step > 1 ? MAX_SHARED_TICKS : MAX_TICKS)
    );
    const lines = Array.from({ length: n }, (_, i) => i).filter((i) => i % every === 0);
    return {
      tickvals: lines.map((line) => side.start + line * side.step + (side.step - 1) / 2),
      ticktext: lines.map((line) => side.firstValues?.[line] ?? side.labels[line]),
    };
  }
  const inView = (groups.runs ?? []).flatMap(({ label, start, end }) => {
    const from = Math.max(start, side.start);
    const to = Math.min(end, side.end - 1);
    return from <= to ? [{ label, from, to }] : [];
  });
  if (inView.length < 2) {
    const places = roundPlaces(side.start, side.end);
    return {
      tickvals: places,
      ticktext: places.map((place) => String(side.members.nodeIds[place - side.start])),
    };
  }
  const named = inView.filter(
    ({ from, to }) => to - from + 1 >= (side.end - side.start) / MAX_RUN_NAMES
  );
  return {
    tickvals: named.map(({ from, to }) => (from + to) / 2),
    ticktext: named.map(({ label }) => label),
  };
}

/** Rules across and down the matrix between one value of the order and the next, where in view. */
function runRules(groups: ConnectivityGroups): Partial<Shape>[] {
  const line = { color: RULE, width: 1 };
  /** Where rules fall on a side, none where there are too many to read. */
  const startsOn = ({ start, end }: MatrixSide) => {
    const starts = (groups.runs ?? [])
      .slice(1)
      .map((run) => run.start)
      .filter((place) => place >= start && place < end);
    return starts.length > MAX_RULES ? [] : starts;
  };
  return [
    ...startsOn(groups.post).map(
      (place): Partial<Shape> => ({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: place - 0.5,
        x1: place - 0.5,
        y0: 0,
        y1: 1,
        line,
      })
    ),
    ...startsOn(groups.pre).map(
      (place): Partial<Shape> => ({
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: place - 0.5,
        y1: place - 0.5,
        line,
      })
    ),
  ];
}

/** A pathway's row and column, as a person reads them. */
export function pathwayName(groups: ConnectivityGroups, pre: number, post: number): string {
  const name = (side: MatrixSide, line: number) => {
    const { start } = lineSpan(side, line);
    const run = groups.runs?.find((r) => start >= r.start && start <= r.end);
    return [side.labels[line], run?.label].filter(Boolean).join(' · ');
  };
  return `${name(groups.pre, pre)} → ${name(groups.post, post)}`;
}

/** What the rest of the matrix is washed out with while a square is pinned: still readable, plainly not the one. */
const VEIL = 'rgba(255, 255, 255, 0.7)';

/** A path round a box of the matrix. */
const pathRound = (x0: number, y0: number, x1: number, y1: number) =>
  `M ${x0},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0},${y1} Z`;

/**
 * Marks a pinned square, however few pixels it takes: the rest of the matrix washed out round it, by one
 * shape with the square as a hole, so that no seam shows, and a ring round it, in two colours so it reads
 * over all of the scale's blues. Shapes take no pointer, so every square can still be hovered and clicked.
 */
function squareMarks({ pre, post }: PathwaySquare, places: number): Partial<Shape>[] {
  const [x0, x1] = [post.start - 0.5, post.end - 0.5];
  const [y0, y1] = [pre.start - 0.5, pre.end - 0.5];
  const axes = { xref: 'x' as const, yref: 'y' as const };
  const box = { ...axes, type: 'rect' as const, x0, x1, y0, y1 };
  return [
    {
      ...axes,
      type: 'path',
      path: `${pathRound(-0.5, -0.5, places - 0.5, places - 0.5)} ${pathRound(x0, y0, x1, y1)}`,
      fillcolor: VEIL,
      line: { width: 0 },
    },
    { ...box, line: { color: '#ffffff', width: 5 } },
    { ...box, line: { color: '#111827', width: 2.5 } },
  ];
}

/** Where a side's lines are drawn, at the middle of the places each takes. */
function lineCenters({ labels, start, step }: MatrixSide): number[] {
  return labels.map((_, line) => start + line * step + (step - 1) / 2);
}

/**
 * The matrix as a heatmap: presynaptic rows down, postsynaptic columns across,
 * each cell the measure from the one to the other. A cell of nothing is left
 * blank, so where there are no connections stands apart from where there are few.
 *
 * The axes run over a side's places, however much of them the lines drawn cover,
 * so new lines for a zoom land where the plot is already looking.
 */
export function connectivityFigure({
  groups,
  measure,
  axis,
  pinned,
  pickable = false,
  revision,
}: {
  groups: ConnectivityGroups;
  measure: ConnectivityMeasure;
  /** What the rows are: a property's values, or neurons in its order. */
  axis: string;
  /** The square pinned, ringed, and the rest of the matrix washed out. */
  pinned?: PathwaySquare | null;
  /** Whether a click on a square does anything, which its card then says. */
  pickable?: boolean;
  /** What the plot's zoom is of: another drops it. */
  revision?: string;
}): Figure {
  const { pre: rows, post: columns, places } = groups;
  const z = rows.labels.map((_, pre) =>
    columns.labels.map((__, post) => {
      const value = cellValue(groups, measure, pre, post);
      return Number.isNaN(value) || value === 0 ? null : value;
    })
  );
  // Plotly keeps a set floor only beside a set ceiling.
  const zmax = z.flat().reduce<number>((top, v) => (v !== null && v > top ? v : top), 0) || 1;
  const { unit } = MEASURES.find((m) => m.value === measure) ?? MEASURES[0];
  const data: Data[] = [
    {
      type: 'heatmap',
      x: lineCenters(columns),
      y: lineCenters(rows),
      z,
      colorscale: SCALE,
      zmin: 0,
      zmax,
      xgap: columns.labels.length <= GAPPED_ROWS ? 1 : 0,
      ygap: rows.labels.length <= GAPPED_ROWS ? 1 : 0,
      hoverinfo: 'none',
      hoverongaps: true,
      colorbar: {
        thickness: 10,
        outlinewidth: 0,
        len: 0.9,
        tickfont: { size: 10 },
        title: { text: unit, side: 'right', font: { size: 11 } },
      },
    } as Data,
  ];
  const axisBase = {
    showgrid: false,
    zeroline: false,
    automargin: true,
    ticks: '' as const,
    tickfont: { size: 10 },
  };
  const named = (side: MatrixSide) => {
    const where = ticks(groups, side);
    return where ? { tickmode: 'array' as const, ...where } : {};
  };
  const layout: Partial<Layout> = {
    ...BASE_LAYOUT,
    margin: { l: 8, r: 8, t: 8, b: 8 },
    xaxis: {
      ...axisBase,
      ...named(columns),
      title: axisTitle(`Postsynaptic ${axis}`),
      range: [-0.5, places - 0.5],
    },
    // The first row on top, as a matrix is read.
    yaxis: {
      ...axisBase,
      ...named(rows),
      title: axisTitle(`Presynaptic ${axis}`),
      range: [places - 0.5, -0.5],
    },
    shapes: [...runRules(groups), ...(pinned ? squareMarks(pinned, places) : [])],
    // New lines for a zoom, or a square pinned or let go of, leave the matrix zoomed as it is.
    uirevision: revision ?? `${axis}/${places}`,
  };

  const tooltip = (point: HoverPoint) => {
    const [pre, post] = Array.isArray(point.pointNumber) ? point.pointNumber : [];
    if (pre === undefined || post === undefined) return null;
    const cell = pre * columns.labels.length + post;
    const pairs = possiblePairs(groups, pre, post);
    const connections = groups.connections[cell];
    const synapses = groups.synapses?.[cell];
    const cardRows = [
      {
        label: 'Connection probability',
        value: pairs > 0 ? percent((100 * connections) / pairs) : '—',
        strong: measure === 'probability',
      },
      { label: 'Connections', value: compact(connections), strong: measure === 'connections' },
      { label: 'Possible pairs', value: compact(pairs) },
    ];
    if (synapses !== undefined) {
      cardRows.push(
        { label: 'Synapses', value: compact(synapses), strong: measure === 'synapses' },
        {
          label: 'Synapses per connection',
          value: connections > 0 ? compact(Number((synapses / connections).toPrecision(3))) : '—',
          strong: measure === 'synapsesPerConnection',
        }
      );
    }
    const subtitle = `${rows.sizes[pre].toLocaleString()} → ${columns.sizes[post].toLocaleString()} neurons`;
    return {
      title: pathwayName(groups, pre, post),
      subtitle: groups.by === 'property' ? subtitle : undefined,
      rows: cardRows,
      hint: !pickable
        ? undefined
        : pinned && sameSquare(pinned, squareOf(groups, pre, post))
          ? 'Click to stop filtering to this pathway'
          : 'Click to filter the table and 3D view to this pathway',
    };
  };

  return { data, layout, tooltip };
}
