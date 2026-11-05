import { DIVERGING_COLOURS } from '@/features/lfp-viewer/colour-scale';
import { CONDUCTIVITY } from '@/features/lfp-viewer/field-analysis';
import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import {
  axis,
  BASE_LAYOUT,
  LEGEND_ABOVE,
  MEAN_INK,
  withAlpha,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data } from 'plotly.js-dist-min';
import type { ColourStops } from '@/features/lfp-viewer/colour-scale';
import type {
  Coherence,
  CurrentSourceDensity,
  ProfilePoint,
  Spectrogram,
  TriggeredAverage,
} from '@/features/lfp-viewer/field-analysis';
import type { FieldRow } from '@/features/lfp-viewer/field-structure';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

/** One hue, from pale for little power to dark for much. */
const POWER_COLOURS: ColourStops = [
  [0, '#f0f5ff'],
  [0.25, '#adc6ff'],
  [0.5, '#597ef7'],
  [0.75, '#1d39c4'],
  [1, '#002766'],
];
/** The range of power a spectrogram shows below its strongest. */
const SPECTROGRAM_RANGE_DB = 50;
const MATRIX_TICKS = 12;
/** A contact's line, in its place among the contacts picked. */
export function contactTrace(
  contact: number,
  place: number,
  x: number[],
  y: ArrayLike<number>,
  hovertemplate: string,
  width = 1.5
) {
  return {
    type: 'scatter',
    mode: 'lines',
    name: `e${contact}`,
    x,
    y,
    line: { color: PICK_COLORS[place % PICK_COLORS.length], width },
    hovertemplate,
  };
}

const COLOUR_BAR = { thickness: 10, outlinewidth: 0, tickfont: { size: 10 } };
const PAPER_RIGHT_MARGIN = { ...BASE_LAYOUT.margin, r: 8 };

function rowsOf(values: ArrayLike<number>, rows: number, columns: number) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => values[r * columns + c])
  );
}

function heatmap({
  unit,
  ...trace
}: {
  x: readonly number[];
  y: readonly number[];
  z: number[][];
  text?: string[][];
  zmin: number;
  zmax: number;
  colorscale: ColourStops;
  unit: string;
  hovertemplate: string;
}): Data[] {
  return [
    {
      ...trace,
      type: 'heatmap',
      zsmooth: false,
      colorbar: { ...COLOUR_BAR, title: { text: unit, side: 'right', font: { size: 10 } } },
    },
  ] as unknown as Data[];
}

/**
 * A figure's time axis follows a zoom; its data stays, so Plotly needn't read it
 * again, and a zoom of the plot's other axis stays too.
 */
export function withTimeWindow(figure: Figure, window: [number, number]): Figure {
  return {
    ...figure,
    layout: {
      ...figure.layout,
      uirevision: 'time-figure',
      xaxis: { ...figure.layout.xaxis, range: window, uirevision: window.join() },
    },
  };
}

export function spectrogramFigure({ result }: { result: Spectrogram }): Figure {
  const { times, frequencies, decibels } = result;
  const columns = times.length;
  const bands = frequencies.length;
  let top = -Infinity;
  for (const v of decibels) if (v > top) top = v;
  const floor = top - SPECTROGRAM_RANGE_DB;
  let lastBand = 1;
  for (let b = 1; b < bands; b++) {
    for (let c = 0; c < columns; c++) {
      if (decibels[b * columns + c] > floor) {
        lastBand = b;
        break;
      }
    }
  }
  return {
    data: heatmap({
      x: Array.from(times),
      y: Array.from(frequencies.subarray(0, lastBand + 1)),
      z: rowsOf(decibels, lastBand + 1, columns),
      zmin: floor,
      zmax: top,
      colorscale: POWER_COLOURS,
      unit: 'dB',
      hovertemplate: '%{x:.1f} ms · %{y:.0f} Hz · %{z:.1f} dB<extra></extra>',
    }),
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: axis('Time (ms)'),
      yaxis: axis('Frequency (Hz)', { range: [0, frequencies[lastBand]] }),
    },
  };
}

export function correlationFigure({
  matrix,
  rows,
}: {
  matrix: Float32Array;
  rows: readonly FieldRow[];
}): Figure {
  const n = rows.length;
  const indices = rows.map((_, r) => r);
  const every = Math.max(1, Math.ceil(n / MATRIX_TICKS));
  const tickvals = indices.filter((r) => r % every === 0);
  const ticktext = tickvals.map((r) => rows[r].label);
  const text = rows.map((a) => rows.map((b) => `${a.label} · ${b.label}`));
  const labelled = { automargin: true, tickvals, ticktext, zeroline: false, showgrid: false };
  return {
    data: heatmap({
      x: indices,
      y: indices,
      z: rowsOf(matrix, n, n),
      text,
      zmin: -1,
      zmax: 1,
      colorscale: DIVERGING_COLOURS,
      unit: 'r',
      hovertemplate: '%{text}<br>r = %{z:.3f}<extra></extra>',
    }),
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: { ...labelled, tickangle: -45 },
      yaxis: { ...labelled, autorange: 'reversed' },
    },
  };
}

export function coherenceFigure({
  result,
  contacts,
  reference,
}: {
  result: Coherence;
  contacts: readonly number[];
  reference: number;
}): Figure {
  const x = Array.from(result.frequencies);
  return {
    data: contacts.map((contact, i) =>
      contactTrace(
        contact,
        i,
        x,
        Array.from(result.values[i]),
        `%{x:.1f} Hz · %{y:.3f}<extra>e${contact} with e${reference}</extra>`
      )
    ) as Data[],
    layout: {
      ...BASE_LAYOUT,
      showlegend: contacts.length > 1,
      legend: LEGEND_ABOVE,
      xaxis: axis('Frequency (Hz)', { type: 'log' }),
      yaxis: axis(`Coherence with e${reference}`, { range: [0, 1.02] }),
    },
  };
}

/** Position along a direction in the circuit, as an axis's title. */
export function alongLabel(direction: readonly number[]): string {
  return `Along (${direction.map((d) => d.toFixed(2)).join(', ')}), µm`;
}

export function profileFigure({
  points,
  measure,
  axisLabel,
  selected,
  range,
}: {
  points: readonly ProfilePoint[];
  measure: string;
  axisLabel: string;
  selected: ProfilePoint | null;
  /** Held across frames at the player's time, so that the axis doesn't jump. */
  range?: [number, number];
}): Figure {
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: measure,
        x: points.map((p) => p.value),
        y: points.map((p) => p.at),
        line: { color: MEAN_INK, width: 2 },
        marker: { color: MEAN_INK, size: 6 },
        hovertemplate: '%{x:.3g} · %{y:.0f} µm<extra></extra>',
      },
      ...(selected
        ? [
            {
              type: 'scatter',
              mode: 'markers',
              name: 'Selected',
              x: [selected.value],
              y: [selected.at],
              marker: { color: PICK_COLORS[0], size: 10 },
              hovertemplate: '%{x:.3g} · %{y:.0f} µm<extra>selected</extra>',
            },
          ]
        : []),
    ] as Data[],
    layout: {
      ...BASE_LAYOUT,
      // Frames at the player's time keep a zoom of the plot; a new measure starts afresh.
      uirevision: range ? 'at-time' : measure,
      xaxis: axis(measure, range ? { range, zeroline: true, zerolinecolor: '#cbd5e1' } : {}),
      yaxis: axis(axisLabel),
    },
  };
}

export function csdFigure({
  result,
  coordinates,
  axisLabel,
}: {
  result: CurrentSourceDensity;
  /** Of the rows, in µm along the line. */
  coordinates: readonly number[];
  axisLabel: string;
}): Figure {
  const { times, values, rows, limit } = result;
  return {
    data: heatmap({
      x: Array.from(times),
      y: coordinates,
      z: rowsOf(values, rows, times.length),
      zmin: -limit,
      zmax: limit,
      colorscale: DIVERGING_COLOURS,
      unit: 'nA/mm³',
      hovertemplate: '%{x:.1f} ms · %{y:.0f} µm · %{z:.3g} nA/mm³<extra></extra>',
    }),
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: axis(`Time (ms) · σ = ${CONDUCTIVITY} S/m assumed`),
      yaxis: axis(axisLabel),
    },
  };
}

export function triggeredFigure({
  result,
  contacts,
}: {
  result: TriggeredAverage;
  contacts: readonly number[];
}): Figure {
  const x = Array.from(result.lags);
  const firstColour = PICK_COLORS[0];
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        x: [...x, ...x.slice().reverse()],
        y: [
          ...x.map((_, i) => result.means[0][i] + result.error[i]),
          ...x.map((_, i) => result.means[0][i] - result.error[i]).reverse(),
        ],
        fill: 'toself',
        fillcolor: withAlpha(firstColour, 0.18),
        line: { width: 0, color: firstColour },
        hoverinfo: 'skip',
        showlegend: false,
      },
      ...contacts.map((contact, i) =>
        contactTrace(
          contact,
          i,
          x,
          Array.from(result.means[i]),
          `%{x:.1f} ms · %{y:.3g} µV<extra>e${contact}</extra>`,
          i === 0 ? 2 : 1.5
        )
      ),
    ] as Data[],
    layout: {
      ...BASE_LAYOUT,
      showlegend: contacts.length > 1,
      legend: LEGEND_ABOVE,
      xaxis: axis('Time from the spike (ms)'),
      yaxis: axis(result.events > 1 ? 'Mean field (µV)' : 'Field (µV)'),
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 0,
          yref: 'paper',
          y0: 0,
          y1: 1,
          line: { color: MEAN_INK, width: 1, dash: 'dot' },
        },
      ],
    },
  };
}
