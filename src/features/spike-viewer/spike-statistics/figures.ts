import { PICK_COLORS } from '@/features/sonata-viewer/constants';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { CellFrames } from '@/features/sonata-viewer/types';
import type { CellGroup, ValueGroup } from '@/features/spike-viewer/spike-statistics/statistics';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

/** What a hover over a mark shows in place of Plotly's labels: a titled card of a few values. */
export type PlotTooltip = {
  title: string;
  /** Beside the title, such as how many cells the mark is. */
  note?: string;
  /** Under the title, such as what the values measure. */
  subtitle?: string;
  /** The mark's colour, beside the title. */
  swatch?: string;
  rows: { label: string; value: string; strong?: boolean }[];
  /** At the foot, such as what a click does. */
  hint?: string;
};

/** The parts of Plotly's hover point the cards read: which trace and point, and its values. */
export type HoverPoint = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  customdata?: unknown;
  text?: unknown;
  curveNumber?: number;
  /** A heatmap's is its row and column. */
  pointNumber?: number | number[];
  /** A sankey node's or link's. */
  label?: unknown;
  value?: unknown;
  /** A sankey link's ends. */
  source?: { label?: string };
  target?: { label?: string };
};

/** What the statistics plot draws: Plotly's traces and layout, built here so they stay pure. */
export type Figure = {
  data: Data[];
  layout: Partial<Layout>;
  /** The card for the mark under the pointer; its traces hover with `hoverinfo: 'none'`. */
  tooltip?: (point: HoverPoint) => PlotTooltip | null;
};

/** One axis of a scatter: what it is called and a value per node. NaN is no value. */
export type AxisValues = { label: string; values: ArrayLike<number> };

const AXIS_COLOR = '#64748b';
const GRID_COLOR = '#f1f5f9';
/** Groups past the categorical palette: drawn and named on hover, but not given a hue. */
const OTHER_COLOR = '#cbd5e1';
/** Light to dark in one hue, for a statistic's magnitude. */
const SEQUENTIAL: [number, string][] = [
  [0, '#9ecae1'],
  [0.5, '#3182bd'],
  [1, '#08306b'],
];

/** Past this many groups the labels turn, or they run into each other. */
const UPRIGHT_LABELS_MAX = 12;
const MAX_BINS = 60;
/** How far, in bins, a smoothed histogram spreads each count. */
const SMOOTHING_BINS = 1.5;

const BASE_LAYOUT: Partial<Layout> = {
  autosize: true,
  margin: { l: 56, r: 12, t: 8, b: 8 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { size: 11, color: AXIS_COLOR },
  showlegend: false,
  hovermode: 'closest',
};

const axisTitle = (text: string) => ({ text, font: { size: 11 } });

/**
 * A violin per group when the cells are grouped by a node property, and one of
 * them all when they are not.
 *
 * One colour for every group: the groups are told apart by where they stand on
 * the axis, and dozens of hues - an mtype per violin - would say nothing the
 * labels do not. The colour is the population's, as on the raster.
 */
export function violinFigure(
  groups: ValueGroup[],
  groupLabel: string | undefined,
  valueLabel: string,
  color: string
): Figure {
  // Ungrouped, the one violin is every cell's, named on the axis for what it is.
  const violins = groupLabel ? groups : groups.map((g) => ({ ...g, name: groupName(g.name) }));

  // One trace with a category per value rather than a trace per group: one
  // colour, one legend-free series, and Plotly lays the violins out itself.
  const total = violins.reduce((n, g) => n + g.values.length, 0);
  const x = new Array<string>(total);
  const y = new Float64Array(total);
  let cursor = 0;
  for (const g of violins) {
    x.fill(g.name, cursor, cursor + g.values.length);
    y.set(g.values, cursor);
    cursor += g.values.length;
  }
  // From zero for what cannot go below it - counts, rates, intervals - else over
  // the values' own span, where a membrane's mean voltage sits far from zero.
  const negative = y.some((v) => v < 0);

  return {
    data: [
      {
        type: 'violin',
        x,
        y,
        // The data's own range: a kernel run past it would draw negative rates.
        spanmode: 'hard',
        scalemode: 'width',
        points: false,
        box: { visible: true, width: 0.2, fillcolor: '#ffffff', line: { color, width: 1 } },
        meanline: { visible: true, color, width: 1 },
        line: { color, width: 1.5 },
        fillcolor: withAlpha(color, 0.2),
        hoveron: 'violins',
        // The card below, rather than a label per statistic.
        hoverinfo: 'none',
      },
    ] as Data[],
    tooltip: violinTooltip(violins, valueLabel, color),
    layout: {
      ...BASE_LAYOUT,
      xaxis: {
        title: axisTitle(groupLabel ?? ''),
        type: 'category',
        categoryorder: 'array',
        categoryarray: violins.map((g) => g.name),
        tickangle: violins.length > UPRIGHT_LABELS_MAX ? -45 : 0,
        automargin: true,
        showgrid: false,
        zeroline: false,
        linecolor: GRID_COLOR,
      },
      yaxis: {
        title: axisTitle(valueLabel),
        rangemode: negative ? 'normal' : 'tozero',
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
      },
    },
  };
}

/** A violin's card: its group, how many cells, and the statistics its box draws. */
function violinTooltip(
  groups: ValueGroup[],
  valueLabel: string,
  color: string
): NonNullable<Figure['tooltip']> {
  const summaries = new Map<string, PlotTooltip>();
  for (const g of groups) {
    const sorted = Float64Array.from(g.values).sort();
    const n = sorted.length;
    if (n === 0) continue;
    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
    summaries.set(g.name, {
      title: g.name,
      note: `${n.toLocaleString()} ${n === 1 ? 'cell' : 'cells'}`,
      subtitle: valueLabel,
      swatch: color,
      rows: [
        { label: 'Max', value: compact(sorted[n - 1]) },
        { label: 'Q3', value: compact(boxQuantile(sorted, 0.75)) },
        { label: 'Median', value: compact(boxQuantile(sorted, 0.5)), strong: true },
        { label: 'Mean', value: compact(mean) },
        { label: 'Q1', value: compact(boxQuantile(sorted, 0.25)) },
        { label: 'Min', value: compact(sorted[0]) },
      ],
    });
  }
  return (point) => summaries.get(String(point.x)) ?? null;
}

/** As Plotly's `linear` quartiles interpolate, so the card's agree with the box drawn. */
function boxQuantile(sorted: Float64Array, p: number): number {
  const at = p * sorted.length - 0.5;
  if (at < 0) return sorted[0];
  if (at > sorted.length - 1) return sorted[sorted.length - 1];
  const frac = at % 1;
  return frac * sorted[Math.ceil(at)] + (1 - frac) * sorted[Math.floor(at)];
}

function compact(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toPrecision(3)));
}

/** A card's title for a group: the one with no property to group by is every cell. */
function groupName(name: string): string {
  return name === 'All' ? 'All cells' : name;
}

function cellCount(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? 'cell' : 'cells'}`;
}

/**
 * A smoothed histogram per group, overlaid on one value axis: cells per bin,
 * over bins every group shares, with each count spread over its neighbours so
 * the curve loses the histogram's jitter but keeps its total. The groups take
 * the categorical palette in order and go grey past its end; ungrouped, the
 * one curve is the population's colour.
 */
export function densityFigure(
  groups: ValueGroup[],
  groupLabel: string | undefined,
  valueLabel: string,
  color: string,
  binStep: number | undefined,
  unit: string | undefined
): Figure {
  const bins = sharedBins(groups, binStep);
  const centers = bins.counts.map((_, i) => bins.start + (i + 0.5) * bins.width);
  const perBin = `Cells per ${Number(bins.width.toPrecision(3))}${unit ? ` ${unit}` : ''}`;

  const hues = groups.map((_, index) =>
    !groupLabel ? color : index < PICK_COLORS.length ? PICK_COLORS[index] : OTHER_COLOR
  );
  const data = groups.map((g, index) => {
    const counts = new Float64Array(bins.counts.length);
    for (const v of g.values) {
      counts[Math.min(counts.length - 1, Math.floor((v - bins.start) / bins.width))] += 1;
    }
    return {
      type: 'scatter',
      mode: 'lines',
      name: g.name,
      x: centers,
      y: smoothCounts(counts),
      line: { color: hues[index], width: index < PICK_COLORS.length ? 2 : 1, shape: 'spline' },
      // Filled only alone, where one curve hides nothing.
      fill: groupLabel ? 'none' : 'tozeroy',
      fillcolor: withAlpha(color, 0.15),
      showlegend: Boolean(groupLabel) && index < PICK_COLORS.length,
      hoverinfo: 'none',
    };
  });

  return {
    data: data as Data[],
    tooltip: (point) => {
      const g = groups[point.curveNumber ?? -1];
      if (!g || typeof point.x !== 'number' || typeof point.y !== 'number') return null;
      return {
        title: groupName(g.name),
        note: cellCount(g.values.length),
        swatch: hues[point.curveNumber as number],
        rows: [
          { label: valueLabel, value: compact(point.x) },
          { label: perBin, value: point.y.toFixed(1), strong: true },
        ],
      };
    },
    layout: {
      ...BASE_LAYOUT,
      showlegend: Boolean(groupLabel),
      // Beside the curves rather than over them.
      legend: { orientation: 'v', x: 1.02, xanchor: 'left', y: 1, font: { size: 10 } },
      xaxis: {
        title: axisTitle(valueLabel),
        automargin: true,
        showgrid: false,
        zeroline: false,
        linecolor: GRID_COLOR,
      },
      yaxis: {
        title: axisTitle(perBin),
        rangemode: 'tozero',
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
      },
    },
  };
}

/**
 * Every cell as a point placed by two or three columns and coloured by a
 * statistic, light to dark. `rows` narrows it to the cells the table keeps.
 * A cell missing a coordinate has no place and is left out; one missing the
 * statistic is drawn grey underneath the rest.
 */
export function scatterFigure(
  axes: AxisValues[],
  colorBy: AxisValues,
  rows: Uint32Array | null,
  revision: string
): Figure {
  const threeD = axes.length === 3;
  const count = rows ? rows.length : (axes[0]?.values.length ?? 0);
  const coloured: number[][] = axes.map(() => []);
  const plain: number[][] = axes.map(() => []);
  const tones: number[] = [];
  const colouredIds: number[] = [];
  const plainIds: number[] = [];
  for (let i = 0; i < count; i++) {
    const row = rows ? rows[i] : i;
    const point = axes.map((a) => a.values[row]);
    if (point.some((v) => v === undefined || Number.isNaN(v))) continue;
    const tone = colorBy.values[row];
    if (tone === undefined || Number.isNaN(tone)) {
      point.forEach((v, d) => {
        plain[d].push(v);
      });
      plainIds.push(row);
    } else {
      point.forEach((v, d) => {
        coloured[d].push(v);
      });
      tones.push(tone);
      colouredIds.push(row);
    }
  }

  const [xAxis, yAxis, zAxis] = axes;
  const coordinates = (columns: number[][]) =>
    threeD ? { x: columns[0], y: columns[1], z: columns[2] } : { x: columns[0], y: columns[1] };
  const size = threeD ? 2.5 : 5;
  // As the colour scale spans them, for the card's swatch.
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const tone of tones) {
    if (tone < low) low = tone;
    if (tone > high) high = tone;
  }

  const data = [
    {
      type: threeD ? 'scatter3d' : 'scattergl',
      mode: 'markers',
      name: `No ${colorBy.label.toLowerCase()}`,
      ...coordinates(plain),
      customdata: plainIds,
      marker: { size, color: OTHER_COLOR },
      hoverinfo: 'none',
    },
    {
      type: threeD ? 'scatter3d' : 'scattergl',
      mode: 'markers',
      name: colorBy.label,
      ...coordinates(coloured),
      customdata: colouredIds,
      marker: {
        size,
        color: tones,
        colorscale: SEQUENTIAL,
        showscale: true,
        colorbar: { title: { text: colorBy.label, side: 'right' }, thickness: 10, outlinewidth: 0 },
      },
      hoverinfo: 'none',
    },
  ];
  const tooltip = (point: HoverPoint): PlotTooltip | null => {
    const index = point.pointNumber;
    if (typeof index !== 'number') return null;
    const colouredPoint = point.curveNumber === 1;
    const columns = colouredPoint ? coloured : plain;
    const tone = colouredPoint ? tones[index] : undefined;
    const node = (colouredPoint ? colouredIds : plainIds)[index];
    if (node === undefined) return null;
    return {
      title: `Node ${node}`,
      swatch:
        tone === undefined
          ? OTHER_COLOR
          : sequentialColor(high > low ? (tone - low) / (high - low) : 1),
      rows: [
        ...axes.map((a, d) => ({ label: a.label, value: compact(columns[d][index]) })),
        {
          label: colorBy.label,
          value: tone === undefined ? 'No value' : compact(tone),
          strong: tone !== undefined,
        },
      ],
    };
  };

  const axis = (label: string) => ({
    title: axisTitle(label),
    automargin: true,
    gridcolor: GRID_COLOR,
    zeroline: false,
  });
  return {
    data: data as Data[],
    tooltip,
    layout: {
      ...BASE_LAYOUT,
      // A new choice of columns starts the view afresh; new rows keep the zoom.
      uirevision: revision,
      ...(threeD
        ? {
            margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: {
              xaxis: axis(xAxis.label),
              yaxis: axis(yAxis.label),
              zaxis: axis(zAxis.label),
            },
          }
        : { xaxis: axis(xAxis.label), yaxis: axis(yAxis.label) }),
    },
  };
}

/**
 * How the cells of each group fall across a statistic's quartiles, as flows
 * from the groups on the left to the quartiles on the right. The quartiles run
 * light to dark, and each flow takes its quartile's colour.
 */
export function sankeyFigure(
  groups: ValueGroup[],
  valueLabel: string,
  format: (value: number) => string,
  unit: string | undefined
): Figure {
  const all = new Float64Array(groups.reduce((n, g) => n + g.values.length, 0));
  let cursor = 0;
  for (const g of groups) {
    all.set(g.values, cursor);
    cursor += g.values.length;
  }
  all.sort();
  // Quartile edges, with repeats dropped: a statistic most cells share a value
  // of - silence, say - has fewer than four bins.
  const edges = [...new Set([0.25, 0.5, 0.75].map((q) => quantile(all, q)))];
  const binOf = (v: number) => {
    let bin = 0;
    while (bin < edges.length && v > edges[bin]) bin += 1;
    return bin;
  };
  const suffix = unit ? ` ${unit}` : '';
  const bounds = [all[0], ...edges, all[all.length - 1]];
  const bins = edges.length + 1;
  const binLabels = Array.from(
    { length: bins },
    (_, b) => `${format(bounds[b])}–${format(bounds[b + 1])}${suffix}`
  );
  const binColors = Array.from({ length: bins }, (_, b) =>
    sequentialColor(bins === 1 ? 1 : b / (bins - 1))
  );

  const groupColor = '#94a3b8';
  const nodeColors = [...groups.map(() => groupColor), ...binColors];
  const source: number[] = [];
  const target: number[] = [];
  const value: number[] = [];
  const linkColor: string[] = [];
  groups.forEach((g, index) => {
    const counts = new Array<number>(bins).fill(0);
    for (const v of g.values) counts[binOf(v)] += 1;
    counts.forEach((n, b) => {
      if (n === 0) return;
      source.push(index);
      target.push(groups.length + b);
      value.push(n);
      linkColor.push(withAlpha(binColors[b], 0.35));
    });
  });

  return {
    data: [
      {
        type: 'sankey',
        arrangement: 'snap',
        node: {
          label: [...groups.map((g) => g.name), ...binLabels],
          color: nodeColors,
          pad: 8,
          thickness: 12,
          line: { width: 0 },
          hoverinfo: 'none',
        },
        link: { source, target, value, color: linkColor, hoverinfo: 'none' },
      },
    ] as Data[],
    tooltip: (point) => {
      if (typeof point.value !== 'number') return null;
      const share = `${compact((100 * point.value) / Math.max(1, all.length))}%`;
      if (point.source && point.target) {
        // A flow: its group's cells in one quartile.
        const bin = binLabels.indexOf(point.target.label ?? '');
        const group = groups.find((g) => g.name === point.source?.label);
        return {
          title: point.source.label ?? '',
          note: cellCount(point.value),
          subtitle: `${valueLabel} ${point.target.label ?? ''}`,
          swatch: bin >= 0 ? binColors[bin] : undefined,
          rows: [
            {
              label: 'Of the group',
              value: `${compact((100 * point.value) / Math.max(1, group?.values.length ?? 0))}%`,
              strong: true,
            },
            { label: 'Of all cells', value: share },
          ],
        };
      }
      const label = String(point.label ?? '');
      const bin = binLabels.indexOf(label);
      return {
        title: label,
        note: cellCount(point.value),
        subtitle: bin >= 0 ? `${valueLabel}, quartile ${bin + 1} of ${bins}` : undefined,
        swatch: bin >= 0 ? binColors[bin] : groupColor,
        rows: [{ label: 'Of all cells', value: share, strong: true }],
      };
    },
    layout: { ...BASE_LAYOUT, margin: { l: 8, r: 8, t: 8, b: 8 } },
  };
}

/**
 * Bins across every group's values: as the histogram bins them, a whole number
 * of the values' steps wide where they come in steps, else about `MAX_BINS` of
 * a round width.
 */
function sharedBins(groups: ValueGroup[], step: number | undefined) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const g of groups) {
    for (const v of g.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) return { start: 0, width: 1, counts: [0] };
  const stepped = step !== undefined && step > 0 && Number.isFinite(step);
  const width = stepped
    ? step * Math.max(1, Math.ceil((max - min) / step / MAX_BINS))
    : roundWidth((max - min) / MAX_BINS);
  const start = stepped ? min - step / 2 : Math.floor(min / width) * width;
  const count = Math.max(1, Math.floor((max - start) / width) + 1);
  return { start, width, counts: new Array<number>(count).fill(0) };
}

/** 1, 2 or 5 times a power of ten, at least `raw`. */
function roundWidth(raw: number): number {
  if (!(raw > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  return (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude;
}

/** Each bin's count spread over its neighbours, a Gaussian of `SMOOTHING_BINS`, total kept. */
function smoothCounts(counts: Float64Array): Float64Array {
  const radius = Math.ceil(SMOOTHING_BINS * 3);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, k) =>
    Math.exp(-0.5 * ((k - radius) / SMOOTHING_BINS) ** 2)
  );
  const smoothed = new Float64Array(counts.length);
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] === 0) continue;
    // Only over bins that exist, so a count by the edge is not lost past it.
    let total = 0;
    for (let k = -radius; k <= radius; k++) {
      if (i + k >= 0 && i + k < counts.length) total += weights[k + radius];
    }
    for (let k = -radius; k <= radius; k++) {
      const j = i + k;
      if (j >= 0 && j < counts.length) smoothed[j] += (counts[i] * weights[k + radius]) / total;
    }
  }
  return smoothed;
}

/** The `q` quantile of sorted values, interpolating between neighbours. */
function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

function sequentialColor(t: number): string {
  return scaleColor(SEQUENTIAL, t);
}

/** The colour `t` of the way along a Plotly colour scale of hex stops evenly spaced. */
export function scaleColor(scale: readonly [number, string][], t: number): string {
  const stops = scale.map(([, hex]) => Number.parseInt(hex.slice(1), 16));
  const scaled = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const channel = (shift: number) =>
    Math.round(((stops[i] >> shift) & 255) * (1 - f) + ((stops[i + 1] >> shift) & 255) * f);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** About this many bins across the span a PSTH covers. */
const PSTH_BINS = 100;

/** 1, 2 or 5 times a power of ten, nearest `target`: a bin width that reads as a number. */
function roundStep(target: number): number {
  const power = 10 ** Math.floor(Math.log10(target));
  const scaled = target / power;
  return (scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10) * power;
}

/**
 * Each group's firing over time: its spikes per cell per second, in bins of a
 * round width across `span` - the run, or the raster's window - a step line
 * per group.
 */
export function psthFigure(
  groups: CellGroup[],
  spikes: SpikePopulation | undefined,
  span: [number, number],
  rowCount: number,
  groupLabel: string | undefined,
  color: string
): Figure {
  const [from, to] = span;
  const width = roundStep(Math.max(to - from, 1e-6) / PSTH_BINS);
  const bins = Math.max(1, Math.ceil((to - from) / width));
  const groupOf = new Int32Array(rowCount).fill(-1);
  groups.forEach((group, g) => {
    for (const cell of group.cells) if (cell < rowCount) groupOf[cell] = g;
  });
  const counts = groups.map(() => new Float64Array(bins));
  if (spikes) {
    const { nodeIds, timestamps } = spikes;
    for (let i = 0; i < nodeIds.length; i++) {
      const t = timestamps[i];
      const cell = nodeIds[i];
      if (t < from || t >= to || !(cell >= 0 && cell < rowCount)) continue;
      const g = groupOf[cell];
      if (g >= 0) counts[g][Math.min(bins - 1, Math.floor((t - from) / width))] += 1;
    }
  }
  // Steps: each bin's rate from its start, held to the end of the last.
  const x = Float64Array.from({ length: bins + 1 }, (_, b) => Math.min(to, from + b * width));
  const seconds = width / 1000;
  return timeCourseFigure(
    groups.map((group, g) => {
      const y = new Float64Array(bins + 1);
      for (let b = 0; b < bins; b++) y[b] = counts[g][b] / (group.cells.length * seconds);
      y[bins] = y[bins - 1];
      return { name: group.name, cells: group.cells.length, y };
    }),
    x,
    {
      groupLabel,
      color,
      yLabel: 'Rate (Hz)',
      steps: true,
      fill: true,
      note: `${Number(width.toPrecision(3))} ms bins`,
    }
  );
}

/**
 * One population's firing over time, over the cells flagged in `cells` or all
 * `cellCount` of them: spikes per cell per second, in the same round bins as a
 * PSTH figure's, as steps - each bin's rate from its start, held to the end.
 */
export function psthSeries(
  spikes: SpikePopulation | undefined,
  cells: Uint8Array | null,
  cellCount: number,
  span: [number, number]
): { x: Float64Array; y: Float64Array } {
  const [from, to] = span;
  const width = roundStep(Math.max(to - from, 1e-6) / PSTH_BINS);
  const bins = Math.max(1, Math.ceil((to - from) / width));
  let n = cellCount;
  if (cells) {
    n = 0;
    for (let i = 0; i < cellCount; i++) n += cells[i] ? 1 : 0;
  }
  const counts = new Float64Array(bins);
  if (spikes && n > 0) {
    const { nodeIds, timestamps } = spikes;
    for (let i = 0; i < nodeIds.length; i++) {
      const t = timestamps[i];
      const cell = nodeIds[i];
      if (t < from || t >= to || !(cell >= 0 && cell < cellCount)) continue;
      if (cells && !cells[cell]) continue;
      counts[Math.min(bins - 1, Math.floor((t - from) / width))] += 1;
    }
  }
  const x = Float64Array.from({ length: bins + 1 }, (_, b) => Math.min(to, from + b * width));
  const y = new Float64Array(bins + 1);
  const seconds = width / 1000;
  for (let b = 0; b < bins; b++) y[b] = n > 0 ? counts[b] / (n * seconds) : 0;
  y[bins] = y[bins - 1];
  return { x, y };
}

/** Each group's recorded cells averaged frame by frame: their mean over time, a line per group. */
export function meanTraceFigure(
  groups: CellGroup[],
  frames: CellFrames,
  groupLabel: string | undefined,
  yLabel: string,
  color: string
): Figure {
  const columns = frames.nodeIds.length;
  const groupOfCell = new Map<number, number>();
  groups.forEach((group, g) => {
    for (const cell of group.cells) groupOfCell.set(cell, g);
  });
  const groupOfColumn = Int32Array.from(frames.nodeIds, (cell) => groupOfCell.get(cell) ?? -1);
  const members = new Uint32Array(groups.length);
  for (const g of groupOfColumn) if (g >= 0) members[g] += 1;
  const sums = groups.map(() => new Float64Array(frames.times.length));
  for (let f = 0; f < frames.times.length; f++) {
    const row = f * columns;
    for (let c = 0; c < columns; c++) {
      const g = groupOfColumn[c];
      if (g >= 0) sums[g][f] += frames.values[row + c];
    }
  }
  return timeCourseFigure(
    groups.flatMap((group, g) =>
      members[g] > 0
        ? [{ name: group.name, cells: members[g], y: sums[g].map((sum) => sum / members[g]) }]
        : []
    ),
    frames.times,
    { groupLabel, color, yLabel, steps: false, fill: false }
  );
}

/** A line per group over time, coloured as the densities are, with a key once there are groups. */
function timeCourseFigure(
  series: { name: string; cells: number; y: ArrayLike<number> }[],
  x: ArrayLike<number>,
  {
    groupLabel,
    color,
    yLabel,
    steps,
    fill,
    note,
  }: {
    groupLabel: string | undefined;
    color: string;
    yLabel: string;
    steps: boolean;
    /** Down to zero under a lone line, where it hides nothing: a rate, not a voltage. */
    fill: boolean;
    note?: string;
  }
): Figure {
  const hues = series.map((_, index) =>
    !groupLabel ? color : index < PICK_COLORS.length ? PICK_COLORS[index] : OTHER_COLOR
  );
  const data = series.map((s, index) => ({
    type: 'scattergl',
    mode: 'lines',
    name: s.name,
    x,
    y: s.y,
    line: {
      color: hues[index],
      width: index < PICK_COLORS.length ? 1.5 : 1,
      shape: steps ? 'hv' : 'linear',
    },
    fill: fill && !groupLabel ? 'tozeroy' : 'none',
    fillcolor: withAlpha(color, 0.15),
    showlegend: Boolean(groupLabel) && index < PICK_COLORS.length,
    hoverinfo: 'none',
  }));
  return {
    data: data as Data[],
    tooltip: (point) => {
      const s = series[point.curveNumber ?? -1];
      let i = point.pointNumber;
      if (!s || typeof i !== 'number') return null;
      // Steps hold each bin's value from its start; the last point only ends the last bin.
      if (steps && i === x.length - 1) i -= 1;
      const time = (t: number) => String(Number(t.toFixed(1)));
      return {
        title: groupName(s.name),
        note: cellCount(s.cells),
        subtitle: note,
        swatch: hues[point.curveNumber as number],
        rows: [
          {
            label: 'Time',
            value: steps ? `${time(x[i])}–${time(x[i + 1] ?? x[i])} ms` : `${time(x[i])} ms`,
          },
          { label: yLabel, value: compact(s.y[i]), strong: true },
        ],
      };
    },
    layout: {
      ...BASE_LAYOUT,
      showlegend: Boolean(groupLabel),
      legend: { orientation: 'v', x: 1.02, xanchor: 'left', y: 1, font: { size: 10 } },
      xaxis: {
        title: axisTitle(note ? `Time (ms) · ${note}` : 'Time (ms)'),
        automargin: true,
        showgrid: false,
        zeroline: false,
        linecolor: GRID_COLOR,
      },
      yaxis: {
        title: axisTitle(yLabel),
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
        ...(fill ? { rangemode: 'tozero' as const } : {}),
      },
    },
  };
}
