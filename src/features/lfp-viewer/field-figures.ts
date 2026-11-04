import { CONDUCTIVITY } from '@/features/lfp-viewer/field-analysis';
import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import {
  axisTitle,
  BASE_LAYOUT,
  GRID_COLOR,
  MEAN_INK,
  withAlpha,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data, Layout } from 'plotly.js-dist-min';
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
const COLOUR_BAR = { thickness: 10, outlinewidth: 0, tickfont: { size: 10 } };
const PAPER_RIGHT_MARGIN = { ...BASE_LAYOUT.margin, r: 8 };

const axis = (title: string, extra: Partial<Layout['xaxis']> = {}) => ({
  title: axisTitle(title),
  automargin: true,
  gridcolor: GRID_COLOR,
  zeroline: false,
  ...extra,
});

/** Rows of a row-major matrix, as Plotly takes them. */
function rowsOf(values: ArrayLike<number>, rows: number, columns: number) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => values[r * columns + c])
  );
}

/** A contact's power over time, its bands up to where anything shows. */
export function spectrogramFigure({
  result,
  window,
}: {
  result: Spectrogram;
  window: [number, number];
}): Figure {
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
    data: [
      {
        type: 'heatmap',
        x: Array.from(times),
        y: Array.from(frequencies),
        z: rowsOf(decibels, bands, columns),
        zmin: floor,
        zmax: top,
        zsmooth: false,
        colorscale: POWER_COLOURS,
        colorbar: { ...COLOUR_BAR, title: { text: 'dB', side: 'right', font: { size: 10 } } },
        hovertemplate: '%{x:.1f} ms · %{y:.0f} Hz · %{z:.1f} dB<extra></extra>',
      },
    ] as unknown as Data[],
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: axis('Time (ms)', { range: window }),
      yaxis: axis('Frequency (Hz)', { range: [0, frequencies[lastBand]] }),
    },
  };
}

/** Correlation between rows of contacts, in the order the field draws them. */
export function correlationFigure({
  matrix,
  rows,
  colours,
}: {
  matrix: Float32Array;
  rows: readonly FieldRow[];
  colours: ColourStops;
}): Figure {
  const n = rows.length;
  const indices = rows.map((_, r) => r);
  const every = Math.max(1, Math.ceil(n / MATRIX_TICKS));
  const tickvals = indices.filter((r) => r % every === 0);
  const ticktext = tickvals.map((r) => rows[r].label);
  const text = rows.map((a) => rows.map((b) => `${a.label} · ${b.label}`));
  return {
    data: [
      {
        type: 'heatmap',
        x: indices,
        y: indices,
        z: rowsOf(matrix, n, n),
        text,
        zmin: -1,
        zmax: 1,
        zsmooth: false,
        colorscale: colours,
        colorbar: { ...COLOUR_BAR, title: { text: 'r', side: 'right', font: { size: 10 } } },
        hovertemplate: '%{text}<br>r = %{z:.3f}<extra></extra>',
      },
    ] as unknown as Data[],
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: {
        automargin: true,
        tickvals,
        ticktext,
        tickangle: -45,
        zeroline: false,
        showgrid: false,
      },
      yaxis: {
        automargin: true,
        tickvals,
        ticktext,
        autorange: 'reversed',
        zeroline: false,
        showgrid: false,
      },
    },
  };
}

/** How well each contact follows the reference, frequency by frequency. */
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
    data: contacts.map((contact, i) => ({
      type: 'scatter',
      mode: 'lines',
      name: `e${contact}`,
      x,
      y: Array.from(result.values[i]),
      line: { color: PICK_COLORS[i % PICK_COLORS.length], width: 1.5 },
      hovertemplate: `%{x:.1f} Hz · %{y:.3f}<extra>e${contact} with e${reference}</extra>`,
    })) as Data[],
    layout: {
      ...BASE_LAYOUT,
      showlegend: contacts.length > 1,
      legend: { orientation: 'h', x: 0, y: 1.12, font: { size: 10 } },
      xaxis: axis('Frequency (Hz)', { type: 'log' }),
      yaxis: axis(`Coherence with e${reference}`, { range: [0, 1.02] }),
    },
  };
}

/** A value against position along an axis, the selected contact marked on it. */
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
      xaxis: axis(measure, range ? { range, zeroline: true, zerolinecolor: '#cbd5e1' } : {}),
      yaxis: axis(axisLabel),
    },
  };
}

/** The sinks and sources along a line of contacts, over time. */
export function csdFigure({
  result,
  coordinates,
  window,
  colours,
}: {
  result: CurrentSourceDensity;
  /** Of the rows, in µm along the line. */
  coordinates: readonly number[];
  window: [number, number];
  colours: ColourStops;
}): Figure {
  const { times, values, rows } = result;
  const sorted = Float32Array.from(values, Math.abs).sort();
  const limit = sorted[Math.floor((sorted.length - 1) * 0.995)] || 1;
  return {
    data: [
      {
        type: 'heatmap',
        x: Array.from(times),
        y: coordinates,
        z: rowsOf(values, rows, times.length),
        zmin: -limit,
        zmax: limit,
        zsmooth: false,
        colorscale: colours,
        colorbar: {
          ...COLOUR_BAR,
          title: { text: 'nA/mm³', side: 'right', font: { size: 10 } },
        },
        hovertemplate: '%{x:.1f} ms · %{y:.0f} µm · %{z:.3g} nA/mm³<extra></extra>',
      },
    ] as unknown as Data[],
    layout: {
      ...BASE_LAYOUT,
      margin: PAPER_RIGHT_MARGIN,
      xaxis: axis(`Time (ms) · σ = ${CONDUCTIVITY} S/m assumed`, { range: window }),
      yaxis: axis('Position along the line (µm)'),
    },
  };
}

/** The field around a trigger: the first contact with its standard error. */
export function triggeredFigure({
  result,
  contacts,
}: {
  result: TriggeredAverage;
  contacts: readonly number[];
}): Figure {
  const x = Array.from(result.lags);
  const firstColour = PICK_COLORS[0];
  // Spikes at one moment share one stretch of the field: their spread says nothing.
  const band =
    contacts.length > 0 && result.events > 1
      ? [
          {
            type: 'scatter',
            mode: 'lines',
            x: [...x, ...x.slice().reverse()],
            y: [
              ...x.map((_, i) => result.means[0][i] + result.errors[0][i]),
              ...x.map((_, i) => result.means[0][i] - result.errors[0][i]).reverse(),
            ],
            fill: 'toself',
            fillcolor: withAlpha(firstColour, 0.18),
            line: { width: 0, color: firstColour },
            hoverinfo: 'skip',
            showlegend: false,
          },
        ]
      : [];
  return {
    data: [
      ...band,
      ...contacts.map((contact, i) => ({
        type: 'scatter',
        mode: 'lines',
        name: `e${contact}`,
        x,
        y: Array.from(result.means[i]),
        line: { color: PICK_COLORS[i % PICK_COLORS.length], width: i === 0 ? 2 : 1.5 },
        hovertemplate: `%{x:.1f} ms · %{y:.3g} µV<extra>e${contact}</extra>`,
      })),
    ] as Data[],
    layout: {
      ...BASE_LAYOUT,
      showlegend: contacts.length > 1,
      legend: { orientation: 'h', x: 0, y: 1.12, font: { size: 10 } },
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
