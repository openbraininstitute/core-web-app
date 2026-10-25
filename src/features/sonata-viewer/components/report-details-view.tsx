import { Empty } from 'antd';
import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { CHART_LINE_COLOR, PICK_COLORS } from '@/features/sonata-viewer/constants';
import { usePlotListeners } from '@/features/sonata-viewer/hooks/use-plot-listeners';

import type { Remote } from 'comlink';
import type { Config, Layout, PlotData } from 'plotly.js-dist-min';
import type { TimeRange } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type {
  NodeTraceData,
  PickedTrace,
  PopulationMetadata,
} from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

const Plot = createPlotlyComponent(Plotly);

/** Past this many lines one plot stops being readable; the table narrows it down. */
const MAX_SHARED_TRACES = 30;
const DESIRED_POINTS = 1200;
const REFETCH_DELAY_MS = 120;
/** Headroom above and below the population's extremes, as a share of their span. */
const VALUE_PADDING = 0.05;

const AXIS_COLOR = '#cbd5e1';
const GRID_COLOR = '#f1f5f9';
/** Picks past the palette's end: drawn, hovered and named, but not given a hue. */
const OTHER_COLOR = '#94a3b8';
/** The lines a hovered one stands out from, when every cell is drawn. */
const MUTED_COLOR = '#cbd5e1';
/** A cell drawn only while its row is hovered, on top of the picked ones. */
const PREVIEW_COLOR = '#334155';

const CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  displayModeBar: 'hover',
  // a double click resets through `setZoom`, which also refetches the whole run
  doubleClick: false,
};

/** Either axis zoomed in by the user, or null for its home range. */
type Zoom = { x: TimeRange | null; y: [number, number] | null };
const HOME: Zoom = { x: null, y: null };

/**
 * What to say about the plot's lines beside the table that picks them: how to
 * pick, and how many are left out past what one plot can hold.
 */
export function sharedTracesHint(pickedCount: number, keptCount: number): string | null {
  if (pickedCount > MAX_SHARED_TRACES) {
    return `Showing the first ${MAX_SHARED_TRACES} of ${pickedCount} picked cells`;
  }
  if (pickedCount > 0) return null;
  if (keptCount > MAX_SHARED_TRACES) {
    return `Showing ${MAX_SHARED_TRACES} of ${keptCount} cells: tick rows in the table below to pick which to compare`;
  }
  return 'Tick rows in the table below to pick which cells to compare';
}

/**
 * The span of time the plot shows and where it lies across the plot's box, in
 * px, for a scrubber laid out under its time axis.
 */
export type TracesTimeAxis = { from: number; to: number; left: number; right: number };

/**
 * One line on the plot: a trace, its cell's colour slot (null when no cell was
 * picked), and whether it is only there because its row is hovered.
 */
type Line = { traceIndex: number; slot: number | null; preview: boolean };

/**
 * Cells drawn together on one interactive plot.
 *
 * Which cells are the rows picked in the nodes table, each in its own colour
 * and named in the legend; with none picked, the cells the table's filter
 * keeps, in one colour. A row hovered in the table stands out from the rest,
 * or is drawn for as long as it is hovered when it is not among them. The axes
 * are the whole run and the population's whole range of values, so changing
 * which cells are drawn never moves them; only a zoom does, and a zoom
 * refetches every line at full resolution for its window.
 */
export default function ReportDetailsView({
  population,
  worker,
  visibleTraces,
  picked,
  hovered,
  variableName,
  timeCursor,
  onTimeAxisChange,
}: {
  population: PopulationMetadata;
  worker: Remote<SonataWorkerImpl>;
  /** A time to mark on the plot, such as a scene playing the recording above it. */
  timeCursor?: TimeCursor;
  /** Told where the time axis lies whenever it is drawn, zoomed or resized. */
  onTimeAxisChange?: (axis: TracesTimeAxis) => void;
  /** The traces the nodes table's filter keeps; null shows them all. */
  visibleTraces: number[] | null;
  /** The traces of the cells picked in the nodes table, in the order they were picked. */
  picked: PickedTrace[];
  /** The traces of the cell whose row is under the pointer. */
  hovered: number[];
  variableName?: string;
}) {
  const picking = picked.length > 0;
  const kept = useMemo(
    () => visibleTraces ?? population.traces.map((_, index) => index),
    [visibleTraces, population]
  );

  const lines = useMemo<Line[]>(() => {
    const drawn: Line[] = picking
      ? picked.slice(0, MAX_SHARED_TRACES).map((p) => ({ ...p, preview: false }))
      : kept
          .slice(0, MAX_SHARED_TRACES)
          .map((traceIndex) => ({ traceIndex, slot: null, preview: false }));
    const on = new Set(drawn.map((line) => line.traceIndex));
    const previews = hovered
      .filter((traceIndex) => !on.has(traceIndex))
      .map((traceIndex) => ({ traceIndex, slot: null, preview: true }));
    return [...drawn, ...previews];
  }, [picking, picked, kept, hovered]);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty description="No recorded cell passes the table’s filter" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SharedTracesPlot
        population={population}
        worker={worker}
        lines={lines}
        hovered={hovered}
        legend={picking}
        variableName={variableName}
        timeCursor={timeCursor}
        onTimeAxisChange={onTimeAxisChange}
      />
    </div>
  );
}

function SharedTracesPlot({
  population,
  worker,
  lines,
  hovered,
  legend,
  variableName,
  timeCursor,
  onTimeAxisChange,
}: {
  population: PopulationMetadata;
  worker: Remote<SonataWorkerImpl>;
  timeCursor?: TimeCursor;
  onTimeAxisChange?: (axis: TracesTimeAxis) => void;
  lines: Line[];
  hovered: number[];
  /** Name each line in a legend: the picked cells, each in its own colour. */
  legend: boolean;
  variableName?: string;
}) {
  const [zoom, setZoom] = useState<Zoom>(HOME);
  const [fetchRange, setFetchRange] = useState<TimeRange | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setFetchRange(zoom.x), REFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [zoom.x]);

  // The home axes: the whole run, and every value any of the population's cells takes.
  const homeX = useMemo<TimeRange>(
    () => [population.timeConfig.startTime, population.timeConfig.endTime],
    [population]
  );
  const [valueRange, setValueRange] = useState<[number, number] | null>(null);
  useEffect(() => {
    let cancelled = false;
    worker
      .getValueRange(population.name)
      .then(([min, max]) => {
        if (cancelled) return;
        const pad = (max - min || 1) * VALUE_PADDING;
        setValueRange([min - pad, max + pad]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [worker, population.name]);

  const [samples, setSamples] = useState<
    Map<number, { window: TimeRange | null; trace: NodeTraceData }>
  >(new Map());
  useEffect(() => {
    const missing = lines
      .map((line) => line.traceIndex)
      .filter((traceIndex) => samples.get(traceIndex)?.window !== fetchRange);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((traceIndex) =>
        worker
          .getNodeTrace({
            populationName: population.name,
            traceIndex,
            desiredPoints: DESIRED_POINTS,
            zoomRange: fetchRange ? { xStart: fetchRange[0], xEnd: fetchRange[1] } : undefined,
          })
          .then((trace) => [traceIndex, trace] as const)
      )
    )
      .then((results) => {
        if (cancelled) return;
        setSamples((previous) => {
          const next = new Map(previous);
          for (const [traceIndex, trace] of results) {
            next.set(traceIndex, { window: fetchRange, trace });
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lines, fetchRange, worker, population.name, samples]);

  const units = population.dataUnits;
  const timeUnits = population.timeConfig.units;

  const data = useMemo<Partial<PlotData>[]>(() => {
    const hover = new Set(hovered);
    // A hovered cell stands out from the rest, drawn or one past the cap, so
    // every row reads alike. With cells picked, one not among them is only
    // added, so the picked cells keep their look while rows are scanned.
    const picking = lines.some((line) => line.slot !== null);
    const emphasis = lines.some(
      (line) => hover.has(line.traceIndex) && (!line.preview || !picking)
    );
    // the hovered cell last, so it is drawn over everything else
    const ordered = [
      ...lines.filter((line) => !hover.has(line.traceIndex)),
      ...lines.filter((line) => hover.has(line.traceIndex)),
    ];
    return ordered.flatMap((line) => {
      const sampled = samples.get(line.traceIndex);
      if (!sampled) return [];
      const label = population.traces[line.traceIndex]?.label ?? String(line.traceIndex);
      const isHovered = hover.has(line.traceIndex);
      const colored = line.slot !== null && line.slot >= 0;

      let color: string = CHART_LINE_COLOR;
      if (line.preview) color = picking ? PREVIEW_COLOR : CHART_LINE_COLOR;
      else if (colored) color = PICK_COLORS[line.slot as number];
      else if (line.slot !== null) color = OTHER_COLOR;
      // every cell drawn in one colour: the hovered one keeps it, the rest step back
      else if (emphasis && !isHovered) color = MUTED_COLOR;

      let opacity = 1;
      if (line.slot === null && !line.preview && !isHovered) {
        opacity = emphasis ? 0.6 : lines.length > 1 ? 0.7 : 1;
      } else if (emphasis && !isHovered && line.slot !== null) {
        opacity = 0.35;
      }

      return [
        {
          x: sampled.trace.x,
          y: sampled.trace.y,
          type: 'scatter',
          mode: 'lines',
          name: label,
          showlegend: colored,
          line: { color, width: isHovered ? 2.5 : line.slot === null ? 1.25 : 1.5 },
          opacity,
          hovertemplate: `<b>${label}</b>  %{y:.2f} ${units}<br>%{x:.2f} ${timeUnits}<extra></extra>`,
        },
      ];
    });
  }, [lines, hovered, samples, population, units, timeUnits]);

  const x = zoom.x ?? homeX;
  const y = zoom.y ?? valueRange;
  const layout = useMemo<Partial<Layout>>(
    () => ({
      autosize: true,
      // room for the legend kept either way, so ticking the first row does not shrink the plot
      margin: { l: 64, r: 16, t: 36, b: 48 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: legend,
      legend: {
        orientation: 'h',
        x: 0,
        y: 1,
        xanchor: 'left',
        yanchor: 'bottom',
        font: { size: 11, color: '#0f172a' },
      },
      hovermode: 'closest',
      dragmode: 'zoom',
      font: { size: 11, color: '#64748b' },
      hoverlabel: { bgcolor: '#ffffff', bordercolor: AXIS_COLOR, font: { size: 11 } },
      xaxis: {
        // copies: Plotly writes a zoom into the arrays it is handed
        range: [x[0], x[1]],
        title: { text: `Time (${timeUnits})`, standoff: 8 },
        showline: true,
        linecolor: AXIS_COLOR,
        ticks: 'outside',
        tickcolor: AXIS_COLOR,
        showgrid: true,
        gridcolor: GRID_COLOR,
        zeroline: false,
      },
      yaxis: {
        ...(y ? { range: [y[0], y[1]] } : { autorange: true }),
        title: { text: `${variableName ?? unitLabel(units)} (${units})`, standoff: 10 },
        showline: true,
        linecolor: AXIS_COLOR,
        ticks: 'outside',
        tickcolor: AXIS_COLOR,
        showgrid: false,
        zeroline: false,
      },
    }),
    [x, y, legend, timeUnits, units, variableName]
  );

  const attachListeners = usePlotListeners({
    onRelayout: (event) => {
      const next = zoomAfter(zoom, event as Readonly<Record<string, unknown>>);
      if (next) setZoom(next);
    },
    onDoubleClick: () => setZoom(HOME),
  });

  // react-plotly follows the window, not this box, which a scene opening above shrinks.
  const boxRef = useRef<HTMLDivElement>(null);

  // The cursor, moved on the DOM: placed by the plot's own axis, so it follows a zoom,
  // and placed again after every redraw, so a paused one fits a plot that has resized.
  // It carries the time at its foot. Where the axis lies goes to the host as well.
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorLabelRef = useRef<HTMLSpanElement>(null);
  const cursorTimeRef = useRef<number | null>(null);
  const reportedAxisRef = useRef('');
  const placeCursor = useCallback(() => {
    const graph = boxRef.current?.querySelector('.js-plotly-plot') as
      | (HTMLElement & { _fullLayout?: PlotlyLayoutInternals })
      | null;
    const layout = graph?._fullLayout;
    if (layout?.xaxis && onTimeAxisChange) {
      const [from, to] = layout.xaxis.range;
      const axis = { from, to, left: layout._size.l, right: layout._size.l + layout._size.w };
      const key = `${axis.from}:${axis.to}:${axis.left}:${axis.right}`;
      if (key !== reportedAxisRef.current) {
        reportedAxisRef.current = key;
        onTimeAxisChange(axis);
      }
    }
    const cursor = cursorRef.current;
    if (!cursor) return;
    const timeInMs = cursorTimeRef.current;
    if (timeInMs === null || !layout?.xaxis) {
      cursor.style.display = 'none';
      return;
    }
    const [from, to] = layout.xaxis.range;
    if (timeInMs < from || timeInMs > to) {
      cursor.style.display = 'none';
      return;
    }
    const { l, t, h } = layout._size;
    cursor.style.display = 'block';
    cursor.style.left = `${l + layout.xaxis.l2p(timeInMs) - 0.75}px`;
    cursor.style.top = `${t}px`;
    cursor.style.height = `${h}px`;
    if (cursorLabelRef.current) {
      cursorLabelRef.current.textContent = `${timeInMs.toFixed(1)} ${population.timeConfig.units}`;
    }
  }, [onTimeAxisChange, population.timeConfig.units]);
  useEffect(() => {
    if (!timeCursor) return;
    return timeCursor.subscribe((timeInMs) => {
      cursorTimeRef.current = timeInMs;
      placeCursor();
    });
  }, [timeCursor, placeCursor]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const graph = box.querySelector<HTMLElement>('.js-plotly-plot');
      if (graph) {
        Promise.resolve(Plotly.Plots.resize(graph))
          .then(placeCursor)
          .catch(() => {});
      }
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [placeCursor]);

  return (
    <div ref={boxRef} className="relative min-h-0 flex-1">
      <Plot
        data={data}
        layout={layout}
        config={CONFIG}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        onInitialized={(figure, graph) => {
          attachListeners(figure, graph);
          placeCursor();
        }}
        onUpdate={(figure, graph) => {
          attachListeners(figure, graph);
          placeCursor();
        }}
      />
      {timeCursor && (
        <div
          ref={cursorRef}
          // Over the WebGL traces, which sit on a canvas of their own.
          className="pointer-events-none absolute z-10 hidden w-[1.5px] bg-[#f5222d]"
        >
          <span
            ref={cursorLabelRef}
            className="absolute bottom-1 left-1 whitespace-nowrap rounded bg-white/85 px-1 text-[10px] font-semibold text-[#f5222d] tabular-nums"
          />
        </div>
      )}
    </div>
  );
}

/** The parts of Plotly's laid-out graph the cursor reads. */
type PlotlyLayoutInternals = {
  _size: { l: number; t: number; w: number; h: number };
  xaxis?: { range: [number, number]; l2p: (value: number) => number };
};

/**
 * The zoom a relayout leaves, axis by axis: a range sets that axis, an
 * autorange sends it home, and an axis the event does not name keeps its zoom.
 * Null when the event is about neither.
 */
function zoomAfter(current: Zoom, e: Readonly<Record<string, unknown>>): Zoom | null {
  const axis = (name: 'xaxis' | 'yaxis'): [number, number] | null | undefined => {
    if (e[`${name}.autorange`] === true) return null;
    const start = e[`${name}.range[0]`];
    const end = e[`${name}.range[1]`];
    if (typeof start === 'number' && typeof end === 'number') return [start, end];
    const both = e[`${name}.range`];
    if (Array.isArray(both) && typeof both[0] === 'number' && typeof both[1] === 'number') {
      return [both[0], both[1]];
    }
    return undefined;
  };
  const x = axis('xaxis');
  const y = axis('yaxis');
  if (x === undefined && y === undefined) return null;
  return { x: x === undefined ? current.x : x, y: y === undefined ? current.y : y };
}

function unitLabel(units: string): string {
  switch (units) {
    case 'mV':
      return 'Voltage';
    case 'nA':
    case 'pA':
      return 'Current';
    default:
      return 'Value';
  }
}
