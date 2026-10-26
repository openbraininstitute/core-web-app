import { PICK_COLORS } from '@/features/sonata-viewer/constants';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { CellFrames } from '@/features/sonata-viewer/types';
import type { SpikePca } from '@/features/spike-viewer/spike-statistics/pca';
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
 * Cells per bin, over the bins the densities take: one histogram in the
 * population's colour, or, grouped, each bin a stack of its groups' cells in
 * the categorical palette, grey past its end, so the stack is every cell's.
 */
export function histogramFigure(
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
      type: 'bar',
      name: g.name,
      x: centers,
      y: counts,
      width: bins.width,
      // A hairline of the surface between neighbouring bars and stacked groups.
      marker: { color: hues[index], line: { color: '#ffffff', width: 1 } },
      showlegend: Boolean(groupLabel) && index < PICK_COLORS.length,
      hoverinfo: 'none',
    };
  });

  return {
    data: data as Data[],
    tooltip: (point) => {
      const g = groups[point.curveNumber ?? -1];
      if (!g || typeof point.x !== 'number' || typeof point.y !== 'number') return null;
      const from = point.x - bins.width / 2;
      return {
        title: groupName(g.name),
        note: cellCount(g.values.length),
        swatch: hues[point.curveNumber as number],
        rows: [
          { label: valueLabel, value: `${compact(from)} to ${compact(from + bins.width)}` },
          { label: 'Cells', value: point.y.toLocaleString(), strong: true },
        ],
      };
    },
    layout: {
      ...BASE_LAYOUT,
      barmode: 'stack',
      showlegend: Boolean(groupLabel),
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
 * A bar per group at its cells' mean, the standard error of that mean either
 * side, and one bar of them all when they are not grouped. One colour, as the
 * violins have: the groups are told apart by where they stand on the axis.
 */
export function barFigure(
  groups: ValueGroup[],
  groupLabel: string | undefined,
  valueLabel: string,
  color: string
): Figure {
  const bars = groupLabel ? groups : groups.map((g) => ({ ...g, name: groupName(g.name) }));
  const summaries = bars.map((g) => meanAndError(g.values));
  const trace = {
    type: 'bar',
    x: bars.map((g) => g.name),
    y: summaries.map((s) => s.mean),
    error_y: {
      type: 'data',
      array: summaries.map((s) => s.sem),
      visible: true,
      color: MEAN_INK,
      thickness: 1.5,
      width: 4,
    },
    marker: { color, cornerradius: 4 },
    hoverinfo: 'none',
  };

  return {
    data: [trace] as Data[],
    tooltip: (point) => {
      const at = bars.findIndex((g) => g.name === String(point.x));
      const s = summaries[at];
      if (!s) return null;
      return {
        title: bars[at].name,
        note: cellCount(s.n),
        subtitle: valueLabel,
        swatch: color,
        rows: [
          { label: 'Mean', value: compact(s.mean), strong: true },
          { label: 'SEM', value: compact(s.sem) },
          { label: 'SD', value: compact(s.sd) },
        ],
      };
    },
    layout: {
      ...BASE_LAYOUT,
      bargap: 0.35,
      xaxis: {
        title: axisTitle(groupLabel ?? ''),
        type: 'category',
        categoryorder: 'array',
        categoryarray: bars.map((g) => g.name),
        tickangle: bars.length > UPRIGHT_LABELS_MAX ? -45 : 0,
        automargin: true,
        showgrid: false,
        zeroline: false,
        linecolor: GRID_COLOR,
      },
      yaxis: {
        title: axisTitle(`${valueLabel}, mean ± SEM`),
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: true,
        zerolinecolor: GRID_COLOR,
      },
    },
  };
}

/** The mean of `values`, their standard deviation, and the mean's standard error; one value has no spread. */
export function meanAndError(values: Float64Array): {
  n: number;
  mean: number;
  sd: number;
  sem: number;
} {
  const n = values.length;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = n > 0 ? sum / n : Number.NaN;
  let squares = 0;
  for (const v of values) squares += (v - mean) ** 2;
  const sd = n > 1 ? Math.sqrt(squares / (n - 1)) : 0;
  return { n, mean, sd, sem: n > 1 ? sd / Math.sqrt(n) : 0 };
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

/** How a PCA's cells are told apart: coloured by one property, grouped by another, perhaps the same. */
export type PcaSplit = {
  /** One group, "All", when nothing colours them. */
  colours: CellGroup[];
  colourLabel: string | undefined;
  /** A mean each when a property groups them. */
  groups: CellGroup[];
  groupLabel: string | undefined;
  /** How many standard deviations out each group's spread is drawn round its mean; 0 for none. */
  spread: number;
  /** Whether the cells are drawn under their groups' means; without a grouping they always are. */
  points: boolean;
};

/** Means grouped by another property than the colours': not a colour of their own, but ink. */
const MEAN_INK = '#334155';
/** Points round a ring, and rings and segments over an ellipsoid. */
const RING_STEPS = 72;
const SHELL_RINGS = 12;
const SHELL_SEGMENTS = 24;

/**
 * The cells placed by the principal components of their firing over time, two
 * or three of them, each axis naming its component and the share of the
 * variance it holds. A point per cell, in its colour group's hue; with a
 * grouping, each group's mean over them, and its spread round it - an ellipse,
 * or in 3D an ellipsoid, `spread` standard deviations out along the group's
 * own covariance, with the cells under them or not. Means take their cells'
 * hue when one property both colours and groups them, the palette when nothing
 * else carries colours, and ink over cells coloured by something else.
 */
export function pcaFigure(pca: SpikePca, rowCount: number, split: PcaSplit, color: string): Figure {
  const { colours, colourLabel, groups, groupLabel, spread } = split;
  const threeD = pca.scores.length >= 3;
  const indexOf = new Int32Array(rowCount).fill(-1);
  pca.cells.forEach((cell, i) => {
    if (cell < rowCount) indexOf[cell] = i;
  });
  const membersOf = (group: CellGroup) =>
    Array.from(group.cells, (cell) => (cell < rowCount ? indexOf[cell] : -1)).filter((i) => i >= 0);
  const hueAt = (index: number) => (index < PICK_COLORS.length ? PICK_COLORS[index] : OTHER_COLOR);
  const coordinates = (columns: ArrayLike<number>[]) =>
    threeD ? { x: columns[0], y: columns[1], z: columns[2] } : { x: columns[0], y: columns[1] };

  const grouped = groupLabel !== undefined;
  const sameSplit = colourLabel === groupLabel;
  const showPoints = !grouped || split.points;
  // Whether the cells carry the colours: drawn, and coloured by a property.
  const pointColours = showPoints && colourLabel !== undefined;
  // Uncoloured, the cells are the population's colour, or grey behind the means that carry the colours.
  const pointHues = colours.map((_, c) => (colourLabel ? hueAt(c) : grouped ? OTHER_COLOR : color));
  const points = showPoints ? colours.map(membersOf) : [];
  const hueOfColour = new Map(colours.map((group, c) => [group.name, pointHues[c]]));
  const meanHues = groups.map((group, g) =>
    !pointColours ? hueAt(g) : sameSplit ? (hueOfColour.get(group.name) ?? OTHER_COLOR) : MEAN_INK
  );
  const members = grouped ? groups.map(membersOf) : [];
  const spreads = members.map((m) => spreadOf(pca.scores, m));
  const inked = pointColours && !sameSplit;
  // A legend entry toggles a group's cells, mean and spread together; ink means go as one.
  const legendGroup = (g: number) =>
    !pointColours ? `mean:${groups[g].name}` : sameSplit ? groups[g].name : 'means';

  type Trace =
    | { kind: 'cells'; colour: number }
    | { kind: 'mean'; group: number }
    | { kind: 'spread' };
  const kinds: Trace[] = [];
  const data: Record<string, unknown>[] = [];
  points.forEach((shown, c) => {
    const group = colours[c];
    kinds.push({ kind: 'cells', colour: c });
    data.push({
      type: threeD ? 'scatter3d' : 'scattergl',
      mode: 'markers',
      name: group.name,
      legendgroup: group.name,
      ...coordinates(pca.scores.map((score) => shown.map((i) => score[i]))),
      marker: { size: threeD ? 2.5 : 5, color: pointHues[c] },
      hoverinfo: 'none',
      showlegend: Boolean(colourLabel) && c < PICK_COLORS.length,
    });
  });
  if (grouped && spread > 0) {
    spreads.forEach(({ mean, covariance }, g) => {
      if (!covariance) return;
      const lower = cholesky(covariance);
      kinds.push({ kind: 'spread' });
      data.push({
        ...(threeD
          ? {
              type: 'mesh3d',
              ...ellipsoidMesh(mean, lower, spread),
              color: meanHues[g],
              opacity: 0.18,
            }
          : {
              type: 'scatter',
              mode: 'lines',
              ...ellipse(mean, lower, spread),
              line: { color: meanHues[g], width: 2 },
            }),
        name: groups[g].name,
        legendgroup: legendGroup(g),
        hoverinfo: 'skip',
        showlegend: false,
      });
    });
  }
  let inkNamed = false;
  spreads.forEach(({ mean }, g) => {
    if (members[g].length === 0) return;
    // Named by group where the means alone carry the colours, once among ink
    // means, and not at all where their cells' entries already name them.
    const named = !pointColours ? g < PICK_COLORS.length : inked && !inkNamed;
    if (named && inked) inkNamed = true;
    kinds.push({ kind: 'mean', group: g });
    data.push({
      type: threeD ? 'scatter3d' : 'scatter',
      mode: 'markers',
      name: inked ? `${groupLabel} means` : groups[g].name,
      legendgroup: legendGroup(g),
      ...coordinates(mean.map((m) => [m])),
      marker: {
        size: threeD ? 7 : 14,
        symbol: 'diamond',
        color: meanHues[g],
        line: { color: '#ffffff', width: threeD ? 1 : 2 },
      },
      hoverinfo: 'none',
      showlegend: named,
    });
  });

  // Each cell's group, for its card, where the grouping is not what colours it.
  const groupOf = new Int32Array(showPoints && grouped && !sameSplit ? rowCount : 0).fill(-1);
  if (groupOf.length > 0) {
    groups.forEach((group, g) => {
      for (const cell of group.cells) if (cell < rowCount) groupOf[cell] = g;
    });
  }
  const tooltip = (point: HoverPoint): PlotTooltip | null => {
    const kind = kinds[point.curveNumber ?? -1];
    const index = point.pointNumber;
    if (!kind || typeof index !== 'number') return null;
    if (kind.kind === 'mean') {
      const g = kind.group;
      const { mean, covariance } = spreads[g];
      return {
        title: `${groupLabel} ${groups[g].name}`,
        note: `mean of ${cellCount(members[g].length)}`,
        subtitle: covariance ? 'Mean ± SD' : undefined,
        swatch: meanHues[g],
        rows: mean.map((m, c) => ({
          label: `PC${c + 1}`,
          value: covariance
            ? `${compact(m)} ± ${compact(Math.sqrt(covariance[c][c]))}`
            : compact(m),
        })),
      };
    }
    if (kind.kind !== 'cells') return null;
    const i = points[kind.colour][index];
    if (i === undefined) return null;
    const cell = pca.cells[i];
    const g = groupOf.length > 0 ? groupOf[cell] : -1;
    return {
      title: `Node ${cell}`,
      note: colourLabel ? `${colourLabel} ${colours[kind.colour].name}` : undefined,
      swatch: pointHues[kind.colour],
      rows: [
        ...pca.scores.map((score, c) => ({ label: `PC${c + 1}`, value: compact(score[i]) })),
        ...(g >= 0 && groupLabel ? [{ label: groupLabel, value: groups[g].name }] : []),
      ],
    };
  };

  const names = pca.explained.map(
    (share, c) => `PC${c + 1} · ${Number((share * 100).toPrecision(2))}% of the variance`
  );
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
      showlegend: data.some((trace) => trace.showlegend === true),
      // A new grouping redraws the same points; a new set of components starts the view afresh.
      uirevision: `pca:${pca.scores.length}`,
      ...(threeD
        ? {
            margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: { xaxis: axis(names[0]), yaxis: axis(names[1]), zaxis: axis(names[2]) },
          }
        : { xaxis: axis(names[0]), yaxis: axis(names[1]) }),
    },
  };
}

/** A group's mean over the components, and their covariance round it; a lone cell has none. */
export function spreadOf(
  scores: Float64Array[],
  members: readonly number[]
): { mean: number[]; covariance: number[][] | null } {
  const n = members.length;
  const mean = scores.map((score) => members.reduce((sum, i) => sum + score[i], 0) / n);
  if (n < 2) return { mean, covariance: null };
  const covariance = scores.map((a, p) =>
    scores.map((b, q) => {
      let sum = 0;
      for (const i of members) sum += (a[i] - mean[p]) * (b[i] - mean[q]);
      return sum / (n - 1);
    })
  );
  return { mean, covariance };
}

/**
 * The lower triangle L with L Lᵀ the covariance, which carries a unit circle
 * or sphere onto its spread. A direction the group does not vary along stays
 * flat, rather than failing as a strict Cholesky would.
 */
export function cholesky(matrix: number[][]): number[][] {
  const k = matrix.length;
  const largest = Math.max(...matrix.map((row, r) => row[r]), 0);
  const tiny = Math.sqrt(largest) * 1e-9;
  const lower = matrix.map(() => new Array<number>(k).fill(0));
  for (let r = 0; r < k; r++) {
    for (let c = 0; c <= r; c++) {
      let sum = matrix[r][c];
      for (let p = 0; p < c; p++) sum -= lower[r][p] * lower[c][p];
      if (r === c) lower[r][r] = Math.sqrt(Math.max(sum, 0));
      else lower[r][c] = lower[c][c] > tiny ? sum / lower[c][c] : 0;
    }
  }
  return lower;
}

/** `mean` + `scale` L u for a unit vector u. */
function carried(mean: number[], lower: number[][], scale: number, unit: number[]): number[] {
  return mean.map((m, r) => m + scale * lower[r].reduce((sum, l, c) => sum + l * unit[c], 0));
}

/** The ring `scale` standard deviations out round a 2D mean. */
export function ellipse(
  mean: number[],
  lower: number[][],
  scale: number
): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (let s = 0; s <= RING_STEPS; s++) {
    const angle = (2 * Math.PI * s) / RING_STEPS;
    const [px, py] = carried(mean, lower, scale, [Math.cos(angle), Math.sin(angle)]);
    x.push(px);
    y.push(py);
  }
  return { x, y };
}

/** The shell `scale` standard deviations out round a 3D mean, as Plotly's triangles. */
function ellipsoidMesh(mean: number[], lower: number[][], scale: number) {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  for (let r = 0; r <= SHELL_RINGS; r++) {
    const polar = (Math.PI * r) / SHELL_RINGS;
    for (let s = 0; s < SHELL_SEGMENTS; s++) {
      const azimuth = (2 * Math.PI * s) / SHELL_SEGMENTS;
      const unit = [
        Math.sin(polar) * Math.cos(azimuth),
        Math.sin(polar) * Math.sin(azimuth),
        Math.cos(polar),
      ];
      const [px, py, pz] = carried(mean, lower, scale, unit);
      x.push(px);
      y.push(py);
      z.push(pz);
    }
  }
  const i: number[] = [];
  const j: number[] = [];
  const k: number[] = [];
  for (let r = 0; r < SHELL_RINGS; r++) {
    for (let s = 0; s < SHELL_SEGMENTS; s++) {
      const a = r * SHELL_SEGMENTS + s;
      const b = r * SHELL_SEGMENTS + ((s + 1) % SHELL_SEGMENTS);
      i.push(a, a);
      j.push(a + SHELL_SEGMENTS, b + SHELL_SEGMENTS);
      k.push(b + SHELL_SEGMENTS, b);
    }
  }
  return { x, y, z, i, j, k };
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

/** About this many bins across the span a PSTH covers, unless a width is asked for. */
const PSTH_BINS = 100;
/** Past this many a plot of them is slow to draw: a finer bin over a long run is widened to it. */
const MAX_PSTH_BINS = 5000;

/**
 * How a PSTH bins its spikes and smooths their rate: a bin's width in ms, null
 * for about a hundred round ones over the span, and the σ in ms of a Gaussian
 * the binned rate is run through, 0 for none.
 */
export type PsthOptions = { binMs: number | null; sigmaMs: number };
export const DEFAULT_PSTH: PsthOptions = { binMs: null, sigmaMs: 0 };

/** The bins over `span`: the width asked for, or a round one, within what can be drawn. */
function psthBins([from, to]: [number, number], binMs: number | null) {
  const length = Math.max(to - from, 1e-6);
  const width = Math.max(binMs ?? roundStep(length / PSTH_BINS), length / MAX_PSTH_BINS);
  return { width, bins: Math.max(1, Math.ceil(length / width)) };
}

/** A rate run through a Gaussian of `sigma` bins, each bin weighted by the part of it in range. */
function smoothed(rate: Float64Array, sigma: number): Float64Array {
  const radius = Math.ceil(3 * sigma);
  const kernel = Float64Array.from({ length: 2 * radius + 1 }, (_, k) =>
    Math.exp(-((k - radius) ** 2) / (2 * sigma * sigma))
  );
  const out = new Float64Array(rate.length);
  for (let b = 0; b < rate.length; b++) {
    let sum = 0;
    let weight = 0;
    for (let k = Math.max(-radius, -b); k <= Math.min(radius, rate.length - 1 - b); k++) {
      sum += kernel[k + radius] * rate[b + k];
      weight += kernel[k + radius];
    }
    out[b] = sum / weight;
  }
  return out;
}

/**
 * A binned rate as the points of its line: steps, each bin's rate from its
 * start and held to the end of the last; or smoothed, a line through the bins'
 * middles.
 */
function psthPoints(rate: Float64Array, from: number, to: number, width: number, sigmaMs: number) {
  if (sigmaMs > 0) {
    return {
      x: Float64Array.from({ length: rate.length }, (_, b) =>
        Math.min(to, from + (b + 0.5) * width)
      ),
      y: smoothed(rate, sigmaMs / width),
    };
  }
  const y = new Float64Array(rate.length + 1);
  y.set(rate);
  y[rate.length] = rate[rate.length - 1];
  return {
    x: Float64Array.from({ length: rate.length + 1 }, (_, b) => Math.min(to, from + b * width)),
    y,
  };
}

/** What a PSTH's note says of its bins: their width, and the smoothing over them. */
function psthNote(width: number, sigmaMs: number): string {
  const bins = `${Number(width.toPrecision(3))} ms bins`;
  return sigmaMs > 0 ? `${bins} · Gaussian σ ${sigmaMs} ms` : bins;
}

/** 1, 2 or 5 times a power of ten, nearest `target`: a bin width that reads as a number. */
function roundStep(target: number): number {
  const power = 10 ** Math.floor(Math.log10(target));
  const scaled = target / power;
  return (scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10) * power;
}

/**
 * Each group's firing over time: its spikes per cell per second, in bins
 * across `span` - the run, or the raster's window - a line per group, in steps
 * or smoothed.
 */
export function psthFigure(
  groups: CellGroup[],
  spikes: SpikePopulation | undefined,
  span: [number, number],
  rowCount: number,
  groupLabel: string | undefined,
  color: string,
  { binMs, sigmaMs }: PsthOptions = DEFAULT_PSTH
): Figure {
  const [from, to] = span;
  const { width, bins } = psthBins(span, binMs);
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
  const seconds = width / 1000;
  const lines = groups.map((group, g) =>
    psthPoints(
      counts[g].map((count) => count / (group.cells.length * seconds)),
      from,
      to,
      width,
      sigmaMs
    )
  );
  return timeCourseFigure(
    groups.map((group, g) => ({ name: group.name, cells: group.cells.length, y: lines[g].y })),
    lines[0]?.x ?? new Float64Array(0),
    {
      groupLabel,
      color,
      yLabel: 'Rate (Hz)',
      steps: sigmaMs === 0,
      fill: true,
      note: psthNote(width, sigmaMs),
    }
  );
}

/**
 * One population's firing over time, over the cells flagged in `cells` or all
 * `cellCount` of them: spikes per cell per second, in the same bins as a PSTH
 * figure's, as steps - each bin's rate from its start, held to the end - or
 * smoothed the same way.
 */
export function psthSeries(
  spikes: SpikePopulation | undefined,
  cells: Uint8Array | null,
  cellCount: number,
  span: [number, number],
  { binMs, sigmaMs }: PsthOptions = DEFAULT_PSTH
): { x: Float64Array; y: Float64Array } {
  const [from, to] = span;
  const { width, bins } = psthBins(span, binMs);
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
  const seconds = width / 1000;
  return psthPoints(
    counts.map((count) => (n > 0 ? count / (n * seconds) : 0)),
    from,
    to,
    width,
    sigmaMs
  );
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
  // In SVG: a WebGL plot takes one of the few contexts a page has, and when
  // they run out the browser takes the oldest, often the 3D view's.
  const data = series.map((s, index) => ({
    type: 'scatter',
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
