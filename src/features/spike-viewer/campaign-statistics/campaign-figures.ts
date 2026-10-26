import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import { scaleColor } from '@/features/spike-viewer/spike-statistics/figures';
import { SPIKING_HEADING } from '@/features/spike-viewer/spike-statistics/statistics';

import type { Data, Layout } from 'plotly.js-dist-min';
import type {
  SimulationSummary,
  TimeCourseSeries,
} from '@/features/spike-viewer/campaign-statistics/campaign-summaries';
import type {
  Figure,
  HoverPoint,
  PlotTooltip,
} from '@/features/spike-viewer/spike-statistics/figures';

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
  /** What the menus list it under: Spiking, or what a report recorded. */
  heading: string;
};

export const SPIKE_CAMPAIGN_METRICS: readonly CampaignMetric[] = [
  { key: 'meanRate', label: 'Mean rate (Hz)', scale: 1, min: 0, heading: SPIKING_HEADING },
  { key: 'medianRate', label: 'Median rate (Hz)', scale: 1, min: 0, heading: SPIKING_HEADING },
  {
    key: 'activeFraction',
    label: 'Active cells (%)',
    scale: 100,
    min: 0,
    max: 100,
    heading: SPIKING_HEADING,
  },
  { key: 'meanCv', label: 'Mean ISI CV', scale: 1, min: 0, heading: SPIKING_HEADING },
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
  /**
   * For a point that is a mean over parameters on neither axis: every
   * simulation it stands for, the mean of their courses over time, and what
   * its card says of them. `simulationId` is then the one a click shows.
   */
  memberIds?: readonly string[];
  course?: TimeCourseSeries;
  rows?: readonly CardRow[];
} | null;

/** A row of a point's card. */
type CardRow = { label: string; value: string };

const NO_ROWS: readonly CardRow[] = [];

/** Whether a point is the simulation on show, or a mean over it. */
function holds(cell: GridCell, activeId: string | undefined): boolean {
  return (
    !!cell &&
    activeId !== undefined &&
    (cell.simulationId === activeId || !!cell.memberIds?.includes(activeId))
  );
}

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

/** What a plot of a group of cells is drawn with: its name, and the scale it shares with the others. */
export type CampaignPlotOptions = {
  /** Over the plot, in place of the measure's name: a group's. */
  title?: string;
  /** The group of cells the plot sums up, which its cards name; none for all of them. */
  group?: string;
  /** The value range every group's plot is drawn on, so they compare; null for this plot's own. */
  range?: [number, number] | null;
  /** The heatmap's colour bar: on the first of several plots only. Lines are keyed over the plots. */
  key?: boolean;
  /** Where the plot stands on the parameters on neither axis, which its cards say. */
  rows?: readonly CardRow[];
};

const title = (text: string) => ({
  text,
  font: { size: 12, color: '#0f172a' },
  x: 0,
  xanchor: 'left' as const,
  y: 0.98,
});
const axisTitle = (text: string) => ({ text, font: { size: 11 } });

const compact = (value: number) => String(Number(value.toPrecision(3)));

/** A card's rows naming a simulation by where it sits in the scan, on the axes and off them. */
function coordinateRows(
  x: ScanAxis,
  y: ScanAxis | null,
  xi: number,
  yi: number,
  cell: GridCell,
  plotRows: readonly CardRow[]
): CardRow[] {
  const rows = [{ label: x.label, value: x.values[xi]?.text ?? '' }];
  if (y) rows.push({ label: y.label, value: y.values[yi]?.text ?? '' });
  return [...rows, ...plotRows, ...(cell?.rows ?? NO_ROWS)];
}

function showHint(simulationId: string, activeId: string | undefined): string {
  return simulationId === activeId ? 'The simulation on show' : 'Click to show this simulation';
}

/**
 * One measure across the scan: a cell per simulation, or per mean of several,
 * the first parameter across and the second down, the rest where `cellAt`
 * stands on them; the simulation on show is outlined, or the mean over it. A
 * simulation that has not finished fills its cell in its status's colour and
 * is named in it, since some of those colours are the scale's; one still
 * loading stays blank. Each cell carries its simulation's id, so a click on it
 * can pick it.
 */
export function heatmapFigure(
  metric: CampaignMetric,
  x: ScanAxis,
  y: ScanAxis | null,
  cellAt: (xi: number, yi: number) => GridCell,
  activeId: string | undefined,
  {
    title: plotTitle,
    group,
    range = null,
    key = true,
    rows: plotRows = NO_ROWS,
  }: CampaignPlotOptions = {}
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
      if (holds(cell, activeId)) active = [xi, yi];
    }
  }
  // One value everywhere - often so for a few ticked cells - gets a little range
  // of its own, inside what the measure can be, where Plotly would pad it past.
  const finite = z.flat().filter((v): v is number => v !== null);
  const flat = finite.length > 0 && finite.every((v) => v === finite[0]);
  const pad = flat ? Math.abs(finite[0]) * 0.05 || 1 : 0;
  const zRange = range
    ? { zmin: range[0], zmax: range[1] }
    : flat
      ? {
          zmin: Math.max(metric.min ?? Number.NEGATIVE_INFINITY, finite[0] - pad),
          zmax: Math.min(metric.max ?? Number.POSITIVE_INFINITY, finite[0] + pad),
        }
      : {};
  const yTexts = y ? y.values.map((v) => v.text) : [''];
  const xTexts = x.values.map((v) => v.text);

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
            hoverinfo: 'none',
          },
        ]
      : [];
  // Where the colour scale runs, as Plotly runs it, for the card's swatch.
  const low = zRange.zmin ?? Math.min(...finite);
  const high = zRange.zmax ?? Math.max(...finite);
  const tooltip = (point: HoverPoint): PlotTooltip | null => {
    if (!Array.isArray(point.pointNumber)) return null;
    const [yi, xi] = point.pointNumber;
    const cell = cellAt(xi, yi);
    if (!cell) return null;
    const value = z[yi]?.[xi] ?? null;
    const status = cell.status;
    return {
      title: metric.label,
      note: group,
      swatch:
        status?.color ??
        (value === null
          ? undefined
          : scaleColor(SEQUENTIAL, high > low ? (value - low) / (high - low) : 1)),
      rows: [
        ...coordinateRows(x, y, xi, yi, cell, plotRows),
        status
          ? { label: 'Status', value: statusText[yi][xi], strong: true }
          : { label: 'Value', value: value === null ? '—' : compact(value), strong: true },
      ],
      hint: showHint(cell.simulationId, activeId),
    };
  };

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
        showscale: key,
        colorbar: { thickness: 8, outlinewidth: 0, len: 0.9 },
        hoverinfo: 'none',
      },
      ...statusTrace,
    ] as Data[],
    tooltip,
    layout: {
      ...BASE_LAYOUT,
      title: title(plotTitle ?? metric.label),
      // A simulation's cell square, however the plot's box is shaped.
      xaxis: {
        title: axisTitle(x.label),
        type: 'category',
        automargin: true,
        showgrid: false,
        constrain: 'domain',
      },
      yaxis: {
        title: axisTitle(y?.label ?? ''),
        type: 'category',
        automargin: true,
        showgrid: false,
        showticklabels: y !== null,
        scaleanchor: 'x',
        scaleratio: 1,
        constrain: 'domain',
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

/** A line's colour for the second parameter's value at `index`, in the lines plot: the pick palette's, then grey. */
export function lineColor(index: number): string {
  return index < PICK_COLORS.length ? PICK_COLORS[index] : '#cbd5e1';
}

/**
 * The same measure as lines: the first parameter across, a line per value of
 * the second, in the categorical palette. A point per simulation, which a
 * click can pick, the one on show ringed.
 */
export function linesFigure(
  metric: CampaignMetric,
  x: ScanAxis,
  y: ScanAxis | null,
  cellAt: (xi: number, yi: number) => GridCell,
  activeId: string | undefined,
  { title: plotTitle, group, range = null, rows: plotRows = NO_ROWS }: CampaignPlotOptions = {}
): Figure {
  const rows = y ? y.values.length : 1;
  const numeric = x.values.every((v) => typeof v.value === 'number');
  const rings: { x: number | string; y: number }[] = [];
  const cells = Array.from({ length: rows }, (_, yi) => x.values.map((_v, xi) => cellAt(xi, yi)));
  const data = Array.from({ length: rows }, (_, yi) => {
    const points = x.values.map((v, xi) => {
      const cell = cells[yi][xi];
      const value = cell?.summary?.[metric.key];
      return {
        x: numeric ? (v.value as number) : v.text,
        y: value === undefined || Number.isNaN(value) ? null : value * metric.scale,
        id: cell?.simulationId ?? '',
        cell,
      };
    });
    const on = points.find((p) => holds(p.cell, activeId) && p.y !== null);
    if (on) rings.push({ x: on.x, y: on.y as number });
    const color = lineColor(yi);
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
      hoverinfo: 'none',
    };
  });
  // A trace of its own, which hovers and clicks pass through to the point under it.
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
    tooltip: (point) => {
      const yi = point.curveNumber ?? -1;
      const xi = point.pointNumber;
      const line = data[yi];
      if (!line || typeof xi !== 'number' || typeof point.y !== 'number') return null;
      return {
        title: metric.label,
        note: group,
        swatch: line.line.color,
        rows: [
          ...coordinateRows(x, y, xi, yi, cells[yi][xi], plotRows),
          { label: 'Value', value: compact(point.y), strong: true },
        ],
        hint: showHint(line.customdata[xi], activeId),
      };
    },
    layout: {
      ...BASE_LAYOUT,
      title: title(plotTitle ?? metric.label),
      xaxis: {
        title: axisTitle(x.label),
        type: numeric ? 'linear' : 'category',
        automargin: true,
        showgrid: false,
        zeroline: false,
      },
      yaxis: {
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
        ...(range ? { range: [range[0], range[1]] } : { rangemode: 'tozero' }),
      },
    },
  };
}

/** Line styles for the second parameter's values, the first's being the lines' colours. */
export const DASHES = ['solid', 'dash', 'dot', 'dashdot', 'longdash', 'longdashdot'] as const;

/** A line's colour for the first parameter's value at `index`: the pick palette's, then grey. */
export function courseColor(index: number): string {
  return index < PICK_COLORS.length ? PICK_COLORS[index] : '#94a3b8';
}

/**
 * Each simulation over time - its PSTH, or its mean - on one plot: a line per
 * simulation across the scan, or per mean of several, coloured by its value of
 * the first parameter and dashed by its value of the second, the rest where
 * `cellAt` stands on them. The simulation on show's line, or the mean over it,
 * is drawn thicker and on top. A click on a line shows its simulation. Those
 * not finished have no line.
 */
export function coursesFigure(
  x: ScanAxis,
  y: ScanAxis | null,
  cellAt: (xi: number, yi: number) => GridCell,
  courses: ReadonlyMap<string, TimeCourseSeries>,
  activeId: string | undefined,
  label: string,
  steps: boolean,
  { title: plotTitle, group, range = null, rows: plotRows = NO_ROWS }: CampaignPlotOptions = {}
): Figure {
  const rows = y ? y.values.length : 1;
  const lines: {
    line: Data;
    active: boolean;
    xi: number;
    yi: number;
    course: TimeCourseSeries;
    simulationId: string;
    cell: GridCell;
  }[] = [];
  for (let yi = 0; yi < rows; yi++) {
    for (let xi = 0; xi < x.values.length; xi++) {
      const cell = cellAt(xi, yi);
      const course = cell ? (cell.course ?? courses.get(cell.simulationId)) : undefined;
      if (!cell || !course) continue;
      const active = holds(cell, activeId);
      const name = `${x.label} ${x.values[xi].text}${y ? ` · ${y.label} ${y.values[yi].text}` : ''}`;
      const line = {
        type: 'scatter',
        mode: 'lines',
        name,
        x: course.x,
        y: course.y,
        line: {
          color: courseColor(xi),
          dash: DASHES[yi % DASHES.length],
          width: active ? 2.5 : 1.25,
          shape: steps ? 'hv' : 'linear',
        },
        opacity: active ? 1 : 0.75,
        // Each point names its simulation, so a click anywhere on the line picks it.
        customdata: Array.from({ length: course.x.length }, () => cell.simulationId),
        hoverinfo: 'none',
      } as Data;
      lines.push({ line, active, xi, yi, course, simulationId: cell.simulationId, cell });
    }
  }
  // The simulation on show over the rest.
  lines.sort((a, b) => Number(a.active) - Number(b.active));
  const time = (t: number) => String(Number(t.toFixed(1)));
  return {
    data: lines.map((l) => l.line),
    tooltip: (point) => {
      const l = lines[point.curveNumber ?? -1];
      let i = point.pointNumber;
      if (!l || typeof i !== 'number') return null;
      const { x: times, y: values } = l.course;
      // Steps hold each bin's value from its start; the last point only ends the last bin.
      if (steps && i === times.length - 1) i -= 1;
      return {
        title: label,
        note: group,
        swatch: courseColor(l.xi),
        rows: [
          ...coordinateRows(x, y, l.xi, l.yi, l.cell, plotRows),
          {
            label: 'Time',
            value: steps
              ? `${time(times[i])}–${time(times[i + 1] ?? times[i])} ms`
              : `${time(times[i])} ms`,
          },
          { label: 'Value', value: compact(values[i]), strong: true },
        ],
        hint: showHint(l.simulationId, activeId),
      };
    },
    layout: {
      ...BASE_LAYOUT,
      title: title(plotTitle ?? label),
      xaxis: {
        title: axisTitle('Time (ms)'),
        automargin: true,
        showgrid: false,
        zeroline: false,
      },
      yaxis: {
        title: axisTitle(label),
        automargin: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
        ...(range ? { range: [range[0], range[1]] } : {}),
      },
    } as Partial<Layout>,
  };
}
