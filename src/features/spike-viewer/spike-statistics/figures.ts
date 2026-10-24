import { PICK_COLORS } from '@/features/sonata-viewer/constants';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { ValueGroup } from '@/features/spike-viewer/spike-statistics/statistics';

/** What the statistics plot draws: Plotly's traces and layout, built here so they stay pure. */
export type Figure = { data: Data[]; layout: Partial<Layout> };

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
 * A violin per group when the cells are grouped by a node property, a
 * histogram when they are not.
 *
 * One colour for every group: the groups are told apart by where they stand on
 * the axis, and dozens of hues - an mtype per violin - would say nothing the
 * labels do not. The colour is the population's, as on the raster.
 */
export function violinFigure(
  groups: ValueGroup[],
  groupLabel: string | undefined,
  valueLabel: string,
  color: string,
  binStep: number | undefined
): Figure {
  if (!groupLabel) {
    const values = groups[0]?.values ?? new Float64Array(0);
    const bins = binStep ? stepBins(values, binStep) : undefined;
    return {
      data: [
        {
          type: 'histogram',
          x: values,
          ...(bins ? { xbins: bins } : { nbinsx: MAX_BINS }),
          // White bar edges keep neighbouring bins apart.
          marker: { color, line: { color: '#ffffff', width: 1 } },
          hovertemplate: `${valueLabel} %{x}<br>%{y} cells<extra></extra>`,
        },
      ] as Data[],
      layout: {
        ...BASE_LAYOUT,
        bargap: 0,
        xaxis: {
          title: axisTitle(valueLabel),
          automargin: true,
          showgrid: false,
          zeroline: false,
          linecolor: GRID_COLOR,
        },
        yaxis: {
          title: axisTitle('Cells'),
          rangemode: 'tozero',
          automargin: true,
          gridcolor: GRID_COLOR,
          zeroline: false,
        },
      },
    };
  }

  // One trace with a category per value rather than a trace per group: one
  // colour, one legend-free series, and Plotly lays the violins out itself.
  const total = groups.reduce((n, g) => n + g.values.length, 0);
  const x = new Array<string>(total);
  const y = new Float64Array(total);
  let cursor = 0;
  for (const g of groups) {
    x.fill(g.name, cursor, cursor + g.values.length);
    y.set(g.values, cursor);
    cursor += g.values.length;
  }

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
        // Each statistic and its value: the group is the axis label under it already.
        hoverinfo: 'y',
      },
    ] as Data[],
    layout: {
      ...BASE_LAYOUT,
      xaxis: {
        title: axisTitle(groupLabel),
        type: 'category',
        categoryorder: 'array',
        categoryarray: groups.map((g) => g.name),
        tickangle: groups.length > UPRIGHT_LABELS_MAX ? -45 : 0,
        automargin: true,
        showgrid: false,
        zeroline: false,
        linecolor: GRID_COLOR,
      },
      yaxis: {
        title: axisTitle(valueLabel),
        rangemode: 'tozero',
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
        hoverformat: '.3~g',
      },
    },
  };
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

  const data = groups.map((g, index) => {
    const hue = !groupLabel ? color : index < PICK_COLORS.length ? PICK_COLORS[index] : OTHER_COLOR;
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
      line: { color: hue, width: index < PICK_COLORS.length ? 2 : 1, shape: 'spline' },
      // Filled only alone, where one curve hides nothing.
      fill: groupLabel ? 'none' : 'tozeroy',
      fillcolor: withAlpha(color, 0.15),
      showlegend: Boolean(groupLabel) && index < PICK_COLORS.length,
      hovertemplate: `${g.name}<br>${valueLabel} %{x:.3g}<br>%{y:.1f} cells<extra></extra>`,
    };
  });

  return {
    data: data as Data[],
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
  const where = threeD
    ? `${xAxis.label} %{x:.4g}<br>${yAxis.label} %{y:.4g}<br>${zAxis.label} %{z:.4g}`
    : `${xAxis.label} %{x:.4g}<br>${yAxis.label} %{y:.4g}`;
  const size = threeD ? 2.5 : 5;

  const data = [
    {
      type: threeD ? 'scatter3d' : 'scattergl',
      mode: 'markers',
      name: `No ${colorBy.label.toLowerCase()}`,
      ...coordinates(plain),
      customdata: plainIds,
      marker: { size, color: OTHER_COLOR },
      hovertemplate: `Node %{customdata}<br>${where}<extra>no value</extra>`,
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
      hovertemplate: `Node %{customdata}<br>${where}<br>${colorBy.label} %{marker.color:.4g}<extra></extra>`,
    },
  ];

  const axis = (label: string) => ({
    title: axisTitle(label),
    automargin: true,
    gridcolor: GRID_COLOR,
    zeroline: false,
  });
  return {
    data: data as Data[],
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
          color: [...groups.map(() => '#94a3b8'), ...binColors],
          pad: 8,
          thickness: 12,
          line: { width: 0 },
          hovertemplate: '%{label}<br>%{value} cells<extra></extra>',
        },
        link: {
          source,
          target,
          value,
          color: linkColor,
          hovertemplate: `%{source.label} → %{target.label}<br>%{value} cells<extra>${valueLabel}</extra>`,
        },
      },
    ] as Data[],
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
  const stops = SEQUENTIAL.map(([, hex]) => Number.parseInt(hex.slice(1), 16));
  const scaled = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const channel = (shift: number) =>
    Math.round(((stops[i] >> shift) & 255) * (1 - f) + ((stops[i + 1] >> shift) & 255) * f);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Bins a whole number of steps wide and centred on them. Values that come in
 * steps - whole spikes, rates of whole spikes over the run - otherwise land in
 * every other bin of a finer width, and the empty ones read as gaps in the data.
 */
function stepBins(values: Float64Array, step: number) {
  if (!(step > 0 && Number.isFinite(step)) || values.length === 0) return undefined;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const size = step * Math.max(1, Math.ceil((max - min) / step / MAX_BINS));
  return { start: min - step / 2, end: max + step / 2, size };
}

function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
