import { possiblePairs } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import {
  axisTitle,
  BASE_LAYOUT,
  compact,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data, Layout, Shape } from 'plotly.js-dist-min';
import type { ConnectivityGroups } from '@/features/circuit-nodes/connectivity/connectivity-groups';
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
/** The share of an axis a run takes to be named on it: one in this many of its rows. */
const MAX_RUN_NAMES = 25;
/** Up to this many rows, a hairline between cells keeps them apart. */
const GAPPED_ROWS = 40;

/** The value of the cell from row `pre` to `post`: NaN where it has none to give. */
export function cellValue(
  groups: ConnectivityGroups,
  measure: ConnectivityMeasure,
  pre: number,
  post: number
): number {
  const cell = pre * groups.labels.length + post;
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

/**
 * Where each row is named: every row, or the middle of each run of an order's
 * value wide enough to hold its name. A narrower one is named on hover.
 */
function ticks(groups: ConnectivityGroups) {
  const n = groups.labels.length;
  if (groups.runs) {
    const named = groups.runs.filter((run) => run.end - run.start + 1 >= n / MAX_RUN_NAMES);
    return {
      tickvals: named.map((run) => (run.start + run.end) / 2),
      ticktext: named.map((run) => run.label),
    };
  }
  if (groups.nodeIds || n > MAX_TICKS * 4) return null;
  const step = Math.ceil(n / MAX_TICKS);
  const rows = Array.from({ length: n }, (_, i) => i).filter((i) => i % step === 0);
  return { tickvals: rows, ticktext: rows.map((i) => groups.labels[i]) };
}

/** Rules across and down the matrix between one value of the order and the next. */
function runRules(groups: ConnectivityGroups): Partial<Shape>[] {
  return (groups.runs ?? []).slice(1).flatMap((run) => {
    const at = run.start - 0.5;
    const line = { color: RULE, width: 1 };
    return [
      { type: 'line', xref: 'x', yref: 'paper', x0: at, x1: at, y0: 0, y1: 1, line },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: at, y1: at, line },
    ] as Partial<Shape>[];
  });
}

/**
 * The matrix as a heatmap: presynaptic rows down, postsynaptic columns across,
 * each cell the measure from the one to the other. A cell of nothing is left
 * blank, so where there are no connections stands apart from where there are few.
 */
export function connectivityFigure({
  groups,
  measure,
  axis,
}: {
  groups: ConnectivityGroups;
  measure: ConnectivityMeasure;
  /** What the rows are: a property's values, or neurons in its order. */
  axis: string;
}): Figure {
  const n = groups.labels.length;
  const z = Array.from({ length: n }, (_, pre) =>
    Array.from({ length: n }, (__, post) => {
      const value = cellValue(groups, measure, pre, post);
      return Number.isNaN(value) || value === 0 ? null : value;
    })
  );
  // Plotly keeps a set floor only beside a set ceiling.
  const zmax = z.flat().reduce<number>((top, v) => (v !== null && v > top ? v : top), 0) || 1;
  const { unit } = MEASURES.find((m) => m.value === measure) ?? MEASURES[0];
  const gap = n <= GAPPED_ROWS ? 1 : 0;
  const rows = Array.from({ length: n }, (_, i) => i);
  const data: Data[] = [
    {
      type: 'heatmap',
      x: rows,
      y: rows,
      z,
      colorscale: SCALE,
      zmin: 0,
      zmax,
      xgap: gap,
      ygap: gap,
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
  const named = ticks(groups);
  const axisBase = {
    showgrid: false,
    zeroline: false,
    automargin: true,
    range: [-0.5, n - 0.5],
    ticks: '' as const,
    tickfont: { size: 10 },
    ...(named ? { tickmode: 'array' as const, ...named } : {}),
  };
  const layout: Partial<Layout> = {
    ...BASE_LAYOUT,
    margin: { l: 8, r: 8, t: 8, b: 8 },
    xaxis: { ...axisBase, title: axisTitle(`Postsynaptic ${axis}`) },
    // The first row on top, as a matrix is read.
    yaxis: { ...axisBase, title: axisTitle(`Presynaptic ${axis}`), range: [n - 0.5, -0.5] },
    shapes: runRules(groups),
  };

  const tooltip = (point: HoverPoint) => {
    const [pre, post] = Array.isArray(point.pointNumber) ? point.pointNumber : [];
    if (pre === undefined || post === undefined) return null;
    const cell = pre * n + post;
    const runOf = (row: number) => groups.runs?.find((r) => row >= r.start && row <= r.end);
    const name = (row: number) =>
      [groups.labels[row], runOf(row)?.label].filter(Boolean).join(' · ');
    const pairs = possiblePairs(groups, pre, post);
    const connections = groups.connections[cell];
    const synapses = groups.synapses?.[cell];
    const rows = [
      {
        label: 'Connection probability',
        value: pairs > 0 ? percent((100 * connections) / pairs) : '—',
        strong: measure === 'probability',
      },
      { label: 'Connections', value: compact(connections), strong: measure === 'connections' },
      { label: 'Possible pairs', value: compact(pairs) },
    ];
    if (synapses !== undefined) {
      rows.push(
        { label: 'Synapses', value: compact(synapses), strong: measure === 'synapses' },
        {
          label: 'Synapses per connection',
          value: connections > 0 ? compact(Number((synapses / connections).toPrecision(3))) : '—',
          strong: measure === 'synapsesPerConnection',
        }
      );
    }
    const neurons = (row: number) => groups.sizes[row].toLocaleString();
    return {
      title: `${name(pre)} → ${name(post)}`,
      subtitle: groups.by === 'property' ? `${neurons(pre)} → ${neurons(post)} neurons` : undefined,
      rows,
    };
  };

  return { data, layout, tooltip };
}
