import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import {
  axisTitle,
  BASE_LAYOUT,
  cellCount,
  compact,
  GRID_COLOR,
  groupName,
  OTHER_COLOR,
  withAlpha,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data } from 'plotly.js-dist-min';
import type { CellFrames } from '@/features/sonata-viewer/types';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';
import type { CellGroup } from '@/features/spike-viewer/spike-statistics/statistics';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

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
