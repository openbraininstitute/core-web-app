import { PICK_COLORS } from '@/features/sonata-viewer/constants';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { SimulationSummary } from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import type { Figure } from '@/features/spike-viewer/spike-statistics/figures';

/** One measure of a simulation the campaign's plots compare, by its key in the summaries. */
export type CampaignMetric = {
  key: string;
  label: string;
  /** Shown as, from the summary's own units: the active share as a percentage. */
  scale: number;
  /** The least it can be, once scaled, where it has a least: a rate's 0, not a voltage. */
  min?: number;
  /** The most it can be, once scaled, where it has a most. */
  max?: number;
};

export const SPIKE_CAMPAIGN_METRICS: readonly CampaignMetric[] = [
  { key: 'meanRate', label: 'Mean rate (Hz)', scale: 1, min: 0 },
  { key: 'medianRate', label: 'Median rate (Hz)', scale: 1, min: 0 },
  { key: 'activeFraction', label: 'Active cells (%)', scale: 100, min: 0, max: 100 },
  { key: 'meanCv', label: 'Mean ISI CV', scale: 1, min: 0 },
];

/** A scan parameter as an axis: its name, and its values in order with their text. */
export type ScanAxis = { label: string; values: { id: string; text: string; value: unknown }[] };

/**
 * The simulation at one point of the plots' grid: its summary once it has one,
 * or, for one that has not finished, its status and that status's colour.
 */
export type GridCell = {
  simulationId: string;
  summary: SimulationSummary | undefined;
  status?: { name: string; color: string };
} | null;

const AXIS_COLOR = '#64748b';
const GRID_COLOR = '#f1f5f9';
const SEQUENTIAL: [number, string][] = [
  [0, '#deebf7'],
  [0.5, '#6baed6'],
  [1, '#08306b'],
];

const BASE_LAYOUT: Partial<Layout> = {
  autosize: true,
  margin: { l: 56, r: 8, t: 28, b: 8 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { size: 11, color: AXIS_COLOR },
  showlegend: false,
  hovermode: 'closest',
};

const title = (text: string) => ({
  text,
  font: { size: 12, color: '#0f172a' },
  x: 0,
  xanchor: 'left' as const,
  y: 0.98,
});
const axisTitle = (text: string) => ({ text, font: { size: 11 } });

/**
 * One measure across the scan: a cell per simulation, the first parameter
 * across and the second down, the rest at the values of the simulation on
 * show, which is outlined. A simulation that has not finished fills its cell
 * in its status's colour and is named in it, since some of those colours are
 * the scale's; one still loading stays blank. Each cell carries its
 * simulation's id, so a click on it can pick it.
 */
export function heatmapFigure(
  metric: CampaignMetric,
  x: ScanAxis,
  y: ScanAxis | null,
  cellAt: (xi: number, yi: number) => GridCell,
  activeId: string | undefined
): Figure {
  const rows = y ? y.values.length : 1;
  const z: (number | null)[][] = [];
  const ids: string[][] = [];
  let active: [number, number] | null = null;
  for (let yi = 0; yi < rows; yi++) {
    z.push([]);
    ids.push([]);
    for (let xi = 0; xi < x.values.length; xi++) {
      const cell = cellAt(xi, yi);
      const value = cell?.summary?.[metric.key];
      z[yi].push(value === undefined || Number.isNaN(value) ? null : value * metric.scale);
      ids[yi].push(cell?.simulationId ?? '');
      if (cell && cell.simulationId === activeId) active = [xi, yi];
    }
  }
  // One value everywhere - often so for a few ticked cells - gets a little range
  // of its own, inside what the measure can be, where Plotly would pad it past.
  const finite = z.flat().filter((v): v is number => v !== null);
  const flat = finite.length > 0 && finite.every((v) => v === finite[0]);
  const pad = flat ? Math.abs(finite[0]) * 0.05 || 1 : 0;
  const zRange = flat
    ? {
        zmin: Math.max(metric.min ?? Number.NEGATIVE_INFINITY, finite[0] - pad),
        zmax: Math.min(metric.max ?? Number.POSITIVE_INFINITY, finite[0] + pad),
      }
    : {};
  const yTexts = y ? y.values.map((v) => v.text) : [''];
  const xTexts = x.values.map((v) => v.text);
  const where = `${x.label} %{x}${y ? `<br>${y.label} %{y}` : ''}`;

  // The unfinished, over the rest: a cell per status, in steps of one colour each.
  const statuses: { name: string; color: string }[] = [];
  const statusZ: (number | null)[][] = [];
  const statusText: string[][] = [];
  for (let yi = 0; yi < rows; yi++) {
    statusZ.push([]);
    statusText.push([]);
    for (let xi = 0; xi < x.values.length; xi++) {
      const status = cellAt(xi, yi)?.status;
      let k = status ? statuses.findIndex((s) => s.name === status.name) : -1;
      if (status && k < 0) k = statuses.push(status) - 1;
      statusZ[yi].push(status ? k + 0.5 : null);
      statusText[yi].push(status ? status.name.charAt(0).toUpperCase() + status.name.slice(1) : '');
    }
  }
  const statusTrace =
    statuses.length > 0
      ? [
          {
            type: 'heatmap',
            x: xTexts,
            y: yTexts,
            z: statusZ,
            text: statusText,
            customdata: ids,
            zmin: 0,
            zmax: statuses.length,
            colorscale: statuses.flatMap((s, k) => [
              [k / statuses.length, s.color],
              [(k + 1) / statuses.length, s.color],
            ]),
            showscale: false,
            hoverongaps: false,
            texttemplate: '%{text}',
            textfont: { size: 10 },
            xgap: 2,
            ygap: 2,
            hovertemplate: `${where}<br>Status: %{text}<extra></extra>`,
          },
        ]
      : [];

  return {
    data: [
      {
        type: 'heatmap',
        x: xTexts,
        y: yTexts,
        z,
        customdata: ids,
        colorscale: SEQUENTIAL,
        ...zRange,
        hoverongaps: false,
        texttemplate: '%{z:.3g}',
        textfont: { size: 10 },
        xgap: 2,
        ygap: 2,
        colorbar: { thickness: 8, outlinewidth: 0, len: 0.9 },
        hovertemplate: `${where}<br>${metric.label} %{z:.3g}<extra>click to show</extra>`,
      },
      ...statusTrace,
    ] as Data[],
    layout: {
      ...BASE_LAYOUT,
      title: title(metric.label),
      xaxis: { title: axisTitle(x.label), type: 'category', automargin: true, showgrid: false },
      yaxis: {
        title: axisTitle(y?.label ?? ''),
        type: 'category',
        automargin: true,
        showgrid: false,
        showticklabels: y !== null,
      },
      shapes: active
        ? [
            {
              type: 'rect',
              xref: 'x',
              yref: 'y',
              x0: active[0] - 0.5,
              x1: active[0] + 0.5,
              y0: active[1] - 0.5,
              y1: active[1] + 0.5,
              line: { color: '#0f172a', width: 2 },
            },
          ]
        : [],
    },
  };
}

/**
 * The same measure as lines: the first parameter across, a line per value of
 * the second, in the categorical palette. A point per simulation, which a
 * click can pick, the one on show ringed. `legend` keys the lines, for the
 * one plot of a row that carries it.
 */
export function linesFigure(
  metric: CampaignMetric,
  x: ScanAxis,
  y: ScanAxis | null,
  cellAt: (xi: number, yi: number) => GridCell,
  activeId: string | undefined,
  legend: boolean
): Figure {
  const rows = y ? y.values.length : 1;
  const numeric = x.values.every((v) => typeof v.value === 'number');
  const rings: { x: number | string; y: number }[] = [];
  const data = Array.from({ length: rows }, (_, yi) => {
    const points = x.values.map((v, xi) => {
      const cell = cellAt(xi, yi);
      const value = cell?.summary?.[metric.key];
      return {
        x: numeric ? (v.value as number) : v.text,
        y: value === undefined || Number.isNaN(value) ? null : value * metric.scale,
        id: cell?.simulationId ?? '',
      };
    });
    const on = points.find((p) => p.id === activeId && p.y !== null);
    if (on) rings.push({ x: on.x, y: on.y as number });
    const color = yi < PICK_COLORS.length ? PICK_COLORS[yi] : '#cbd5e1';
    return {
      type: 'scatter',
      mode: 'lines+markers',
      name: y ? `${y.label} ${y.values[yi].text}` : metric.label,
      x: points.map((p) => p.x),
      y: points.map((p) => p.y),
      customdata: points.map((p) => p.id),
      connectgaps: false,
      line: { color, width: 2 },
      marker: { color, size: 8 },
      hovertemplate: `${x.label} %{x}<br>${metric.label} %{y:.3g}<extra>%{fullData.name}</extra>`,
    };
  });
  // A trace of its own, so the legend's markers stay plain; hovers and clicks pass through it.
  const ringTrace = rings.length
    ? [
        {
          type: 'scatter',
          mode: 'markers',
          x: rings.map((r) => r.x),
          y: rings.map((r) => r.y),
          marker: { size: 14, color: 'rgba(0,0,0,0)', line: { color: '#0f172a', width: 2 } },
          hoverinfo: 'skip',
          showlegend: false,
        },
      ]
    : [];
  return {
    data: [...data, ...ringTrace] as Data[],
    layout: {
      ...BASE_LAYOUT,
      title: title(metric.label),
      showlegend: legend && y !== null,
      legend: { orientation: 'v', x: 1.02, xanchor: 'left', y: 1, font: { size: 10 } },
      xaxis: {
        title: axisTitle(x.label),
        type: numeric ? 'linear' : 'category',
        automargin: true,
        showgrid: false,
        zeroline: false,
      },
      yaxis: { automargin: true, gridcolor: GRID_COLOR, zeroline: false, rangemode: 'tozero' },
    },
  };
}
