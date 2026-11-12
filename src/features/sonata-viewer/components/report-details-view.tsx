import { Empty } from 'antd';
import Plotly from 'plotly.js-dist-min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import { CHART_LINE_COLOR, TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { usePlotListeners } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import { TIME_CURSOR_COLOR } from '@/features/sonata-viewer/time-cursor';
import { useCellRow } from '@/features/spike-viewer/cell-row';
import { PlotTimeline } from '@/features/spike-viewer/components/plot-timeline';
import { setsAxisRange, useZoomHint, ZoomHint } from '@/features/spike-viewer/components/zoom-hint';
import {
  AXIS_STYLE,
  computeTicks,
  formatTick,
  MARGIN,
} from '@/features/spike-viewer/renderer/axis-overlay';
import { TooltipCard } from '@/features/spike-viewer/spike-statistics/plot-tooltip';

import type { Remote } from 'comlink';
import type { Config, Layout, LayoutAxis, PlotData } from 'plotly.js-dist-min';
import type { TimeRange } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type {
  NodeTraceData,
  PickedTrace,
  PopulationMetadata,
} from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { CellRowSource } from '@/features/spike-viewer/cell-row';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';

const Plot = createPlotlyComponent(Plotly);

/** Past this many lines one plot stops being readable; the table narrows it down. */
const MAX_SHARED_TRACES = 30;
const DESIRED_POINTS = 1200;
const REFETCH_DELAY_MS = 120;
/** Headroom above and below the population's extremes, as a share of their span. */
const VALUE_PADDING = 0.05;

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
  // Its zoom-out tip is ours, over the plot zoomed.
  showTips: false,
};

/** Either axis zoomed in by the user, or null for its home range. */
type Zoom = { x: TimeRange | null; y: [number, number] | null };
const HOME: Zoom = { x: null, y: null };

/** The point of a line under the pointer, for its card, and where the pointer is on screen. */
type TraceHover = {
  traceIndex: number;
  color: string;
  time: number;
  value: number;
  clientX: number;
  clientY: number;
};

/** As the raster's axes draw theirs: a line and outside ticks, with the labels in its font. */
const AXIS: Partial<LayoutAxis> = {
  showline: true,
  linecolor: AXIS_STYLE.line,
  linewidth: 1,
  ticks: 'outside',
  ticklen: 5,
  tickwidth: 1,
  tickcolor: AXIS_STYLE.line,
  tickfont: { size: 11, color: AXIS_STYLE.text, family: AXIS_STYLE.font },
  zeroline: false,
};

/**
 * Ticks every round step across `range`, about one per `spacing` px of
 * `length`, of which only the two at the ends are labelled: the raster's axes.
 */
function endLabelledTicks(
  range: readonly [number, number],
  length: number,
  spacing: number
): Partial<LayoutAxis> {
  const ticks = computeTicks(range[0], range[1], Math.max(2, Math.floor(length / spacing)));
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  return {
    tickmode: 'array',
    tickvals: ticks,
    ticktext: ticks.map((v, i) => (i === 0 || i === ticks.length - 1 ? formatTick(v, step) : '')),
  };
}

/** An axis title placed as the raster places its own: on the tick labels' row, between the two. */
function axisTitle(text: string, axis: 'x' | 'y'): Partial<Layout['annotations'][number]> {
  const font = { size: 12, color: AXIS_STYLE.text, family: AXIS_STYLE.font };
  return axis === 'x'
    ? {
        text,
        font,
        xref: 'paper',
        yref: 'paper',
        x: 0.5,
        y: 0,
        xanchor: 'center',
        yanchor: 'top',
        yshift: -AXIS_STYLE.labelGap,
        showarrow: false,
        borderpad: 0,
      }
    : {
        text,
        font,
        xref: 'paper',
        yref: 'paper',
        x: 0,
        y: 0.5,
        xanchor: 'right',
        yanchor: 'middle',
        xshift: -AXIS_STYLE.labelGap,
        textangle: '-90',
        showarrow: false,
        borderpad: 0,
      };
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
  timeWindow,
  onTimeWindowChange,
  cellRows,
  onCellClick,
  events,
}: {
  population: PopulationMetadata;
  worker: Remote<SonataWorkerImpl>;
  /** A time to mark on the plot, such as a scene playing the recording above it. */
  timeCursor?: TimeCursor;
  /** The config's timings, marked over the traces as over the raster. */
  events?: readonly TimelineEvent[];
  /**
   * The span of time shown, null for the whole run: the host's where it holds
   * one, so its plots share it, else the plot's own.
   */
  timeWindow?: TimeRange | null;
  /** Told the span of time a zoom leaves, null once it is back on the whole run. */
  onTimeWindowChange?: (window: TimeRange | null) => void;
  /** Told where the time axis lies whenever it is drawn, zoomed or resized. */
  onTimeAxisChange?: (axis: TracesTimeAxis) => void;
  /** Where a hovered line's card reads its cell's row of the nodes table. */
  cellRows?: CellRowSource;
  /** Told the node id of a line clicked, and the line's trace. */
  onCellClick?: (nodeId: number, traceIndex: number) => void;
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
        timeWindow={timeWindow}
        onTimeWindowChange={onTimeWindowChange}
        cellRows={cellRows}
        onCellClick={onCellClick}
        events={events}
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
  timeWindow,
  onTimeWindowChange,
  cellRows,
  onCellClick,
  events,
}: {
  population: PopulationMetadata;
  worker: Remote<SonataWorkerImpl>;
  timeCursor?: TimeCursor;
  events?: readonly TimelineEvent[];
  onTimeAxisChange?: (axis: TracesTimeAxis) => void;
  timeWindow?: TimeRange | null;
  onTimeWindowChange?: (window: TimeRange | null) => void;
  cellRows?: CellRowSource;
  onCellClick?: (nodeId: number, traceIndex: number) => void;
  lines: Line[];
  hovered: number[];
  /** Name each line in a legend: the picked cells, each in its own colour. */
  legend: boolean;
  variableName?: string;
}) {
  const [zoom, setZoom] = useState<Zoom>(HOME);
  const zoomX = timeWindow !== undefined ? timeWindow : zoom.x;
  const [fetchRange, setFetchRange] = useState<TimeRange | null>(zoomX);
  useEffect(() => {
    const timer = setTimeout(() => setFetchRange(zoomX), REFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [zoomX]);

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

  // The lines in the order they are drawn, with the colour each is drawn in, for a hover to name.
  const { data, drawn } = useMemo(() => {
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
    const drawnLines: { traceIndex: number; color: string }[] = [];
    const traces = ordered.flatMap((line): Partial<PlotData>[] => {
      const sampled = samples.get(line.traceIndex);
      if (!sampled) return [];
      const label = population.traces[line.traceIndex]?.label ?? String(line.traceIndex);
      const isHovered = hover.has(line.traceIndex);
      const colored = line.slot !== null && line.slot >= 0;

      let color: string = CHART_LINE_COLOR;
      if (line.preview) color = picking ? PREVIEW_COLOR : CHART_LINE_COLOR;
      else if (colored) color = TRACE_COLORS[(line.slot as number) % TRACE_COLORS.length];
      else if (line.slot !== null) color = OTHER_COLOR;
      // every cell drawn in one colour: the hovered one keeps it, the rest step back
      else if (emphasis && !isHovered) color = MUTED_COLOR;

      let opacity = 1;
      if (line.slot === null && !line.preview && !isHovered) {
        opacity = emphasis ? 0.6 : lines.length > 1 ? 0.7 : 1;
      } else if (emphasis && !isHovered && line.slot !== null) {
        opacity = 0.35;
      }

      drawnLines.push({ traceIndex: line.traceIndex, color });
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
          // The card below, rather than Plotly's label.
          hoverinfo: 'none',
        },
      ];
    });
    return { data: traces, drawn: drawnLines };
  }, [lines, hovered, samples, population]);

  // The plot's own size, which sets how many ticks its axes get.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const valueLabel = variableName ?? unitLabel(units);
  const x = zoomX ?? homeX;
  const y = zoom.y ?? valueRange;
  const layout = useMemo<Partial<Layout>>(() => {
    const width = (size?.width ?? 600) - MARGIN.left - MARGIN.right;
    const height = (size?.height ?? 300) - MARGIN.top - MARGIN.bottom;
    return {
      autosize: true,
      // The raster's margins, so the two line up; the top keeps room for the
      // legend either way, so ticking the first row does not shrink the plot.
      margin: { l: MARGIN.left, r: MARGIN.right, t: MARGIN.top, b: MARGIN.bottom },
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
      // The line under the pointer is found here, by `lineAt`, not by Plotly.
      hovermode: false,
      dragmode: 'zoom',
      font: { size: 11, color: AXIS_STYLE.text, family: AXIS_STYLE.font },
      xaxis: {
        ...AXIS,
        // copies: Plotly writes a zoom into the arrays it is handed
        range: [x[0], x[1]],
        ...endLabelledTicks(x, width, 80),
        showgrid: true,
        gridcolor: AXIS_STYLE.grid,
      },
      yaxis: {
        ...AXIS,
        ...(y ? { range: [y[0], y[1]], ...endLabelledTicks(y, height, 30) } : { autorange: true }),
        // Until the population's range is known, rather than labels it would take back.
        showticklabels: y !== null,
        showgrid: false,
      },
      annotations: [
        axisTitle(`Time (${timeUnits})`, 'x'),
        axisTitle(`${valueLabel} (${units})`, 'y'),
      ],
    };
  }, [x, y, size, legend, timeUnits, units, valueLabel]);

  const [tip, setTip] = useState<TraceHover>();
  // The graph once drawn, for the timings over it; a timing's card over a line's, which gives way.
  const [graph, setGraph] = useState<HTMLElement | null>(null);
  const [timingHovered, setTimingHovered] = useState(false);
  const [hintUp, zoomed, zoomedOut] = useZoomHint('traces');
  const attachListeners = usePlotListeners({
    onRelayout: (event) => {
      const next = zoomAfter({ x: zoomX, y: zoom.y }, event as Readonly<Record<string, unknown>>);
      if (!next) return;
      if (setsAxisRange(event as Readonly<Record<string, unknown>>)) zoomed();
      setZoom(next);
      if (next.x !== zoomX) onTimeWindowChange?.(next.x);
    },
    onDoubleClick: () => {
      setZoom(HOME);
      onTimeWindowChange?.(null);
      zoomedOut();
    },
  });
  // The line under the pointer, and where on it: only on a line, not near one.
  const lineUnder = (clientX: number, clientY: number) => {
    const layout = (graph as (HTMLElement & { _fullLayout?: PlotlyLayoutInternals }) | null)
      ?._fullLayout;
    if (!graph || !layout) return null;
    const box = graph.getBoundingClientRect();
    const hit = lineAt(
      data,
      layout,
      clientX - box.left - layout._size.l,
      clientY - box.top - layout._size.t
    );
    const line = hit && drawn[hit.curve];
    return line ? { ...line, time: hit.time, value: hit.value } : null;
  };

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
    const label = cursorLabelRef.current;
    if (label) {
      label.textContent = `${timeInMs.toFixed(1)} ${population.timeConfig.units}`;
      // Beside the rule, on whichever side has room for it, as the raster's playhead label.
      const flip = layout.xaxis.l2p(timeInMs) > layout._size.w - 64;
      label.style.left = flip ? 'auto' : '';
      label.style.right = flip ? '4px' : '';
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
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height }
      );
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: a line picked with the pointer; the table's rows pick cells from the keyboard
    <div
      ref={boxRef}
      className="relative min-h-0 flex-1"
      onPointerMove={(e) => {
        const line = lineUnder(e.clientX, e.clientY);
        setTip(line ? { ...line, clientX: e.clientX, clientY: e.clientY } : undefined);
      }}
      // Not while a zoom is dragged out, which Plotly follows over a cover of its own.
      onPointerDown={() => setTip(undefined)}
      onPointerLeave={() => setTip(undefined)}
      onClick={(e) => {
        // A click on the plot itself, which Plotly passes on when nothing was dragged.
        if (!(e.target instanceof Element) || !e.target.closest('.nsewdrag')) return;
        const line = lineUnder(e.clientX, e.clientY);
        const trace = line && population.traces[line.traceIndex];
        if (line && trace) onCellClick?.(trace.nodeId, line.traceIndex);
      }}
    >
      <Plot
        data={data}
        layout={layout}
        config={CONFIG}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        onInitialized={(figure, drawn) => {
          attachListeners(figure, drawn);
          setGraph(drawn);
          placeCursor();
        }}
        onUpdate={(figure, drawn) => {
          attachListeners(figure, drawn);
          placeCursor();
        }}
      />
      {timeCursor && (
        <div
          ref={cursorRef}
          // Over the WebGL traces, which sit on a canvas of their own.
          className="pointer-events-none absolute z-10 hidden w-[1.5px]"
          style={{ background: TIME_CURSOR_COLOR }}
        >
          <span
            ref={cursorLabelRef}
            className="absolute bottom-1 left-1 whitespace-nowrap rounded bg-white/85 px-1 text-[10px] font-semibold tabular-nums"
            style={{ color: TIME_CURSOR_COLOR }}
          />
        </div>
      )}
      {/* The player's time is the rule above, so the timings come without one of their own. */}
      {events && events.length > 0 && (
        <PlotTimeline graph={graph} events={events} onHoverChange={setTimingHovered} />
      )}
      {tip && !timingHovered && (
        <TraceCard
          hover={tip}
          population={population}
          valueLabel={valueLabel}
          cellRows={cellRows}
          hint={onCellClick && clickHint(lines, population, tip.traceIndex)}
        />
      )}
      <ZoomHint visible={hintUp} />
    </div>
  );
}

/** The point of a line under the pointer: when, its value, and its cell's row of the nodes table. */
function TraceCard({
  hover,
  population,
  valueLabel,
  cellRows,
  hint,
}: {
  hover: TraceHover;
  population: PopulationMetadata;
  valueLabel: string;
  cellRows?: CellRowSource;
  hint?: string;
}) {
  const trace = population.traces[hover.traceIndex];
  const row = useCellRow(cellRows, trace?.nodeId ?? null);
  return (
    <TooltipCard
      clientX={hover.clientX}
      clientY={hover.clientY}
      card={{
        title: `Node ${trace?.label ?? hover.traceIndex}`,
        subtitle: population.name,
        swatch: hover.color,
        rows: [
          { label: 'Time', value: `${hover.time.toFixed(2)} ${population.timeConfig.units}` },
          {
            label: valueLabel,
            value: `${hover.value.toFixed(2)} ${population.dataUnits}`,
            strong: true,
          },
          ...(row ?? []),
        ],
        hint,
      }}
    />
  );
}

/**
 * What a click on a line does: picks its cell alone, or a compartment's line its compartment,
 * or lets it go where it is already that.
 */
function clickHint(lines: Line[], population: PopulationMetadata, traceIndex: number): string {
  const trace = population.traces[traceIndex];
  const picked = lines.filter((line) => line.slot !== null && !line.preview);
  if (trace?.compartment !== undefined) {
    const alone = picked.length === 1 && picked[0].traceIndex === traceIndex;
    return alone ? 'Click to show every cell again' : 'Click to pick this compartment alone';
  }
  const alone =
    picked.length > 0 &&
    picked.every((line) => population.traces[line.traceIndex]?.nodeId === trace?.nodeId);
  return alone ? 'Click to show every cell again' : 'Click to pick this cell alone';
}

/** The parts of Plotly's laid-out graph the cursor reads. */
type PlotlyLayoutInternals = {
  _size: { l: number; t: number; w: number; h: number };
  xaxis?: {
    range: [number, number];
    l2p: (value: number) => number;
    p2l: (pixel: number) => number;
  };
  yaxis?: { l2p: (value: number) => number };
};

/** How near the pointer has to come to a line, in px, for it to be the line under it. */
const LINE_HIT_PX = 4;

/** A line's segment under the pointer: which curve, and the time and value there. */
type LineHit = { curve: number; time: number; value: number };

/**
 * The line under a point of the plot area, in its pixels: the nearest drawn
 * segment within `LINE_HIT_PX`, the line drawn later winning a tie, as it is
 * on top. Plotly's own hover takes the nearest sample within 20 px, on a line
 * or beside it, and misses a spike's upstroke between its two samples.
 */
function lineAt(
  traces: readonly Partial<PlotData>[],
  layout: PlotlyLayoutInternals,
  x: number,
  y: number
): LineHit | null {
  const { xaxis, yaxis, _size: size } = layout;
  if (!xaxis || !yaxis || x < 0 || y < 0 || x > size.w || y > size.h) return null;
  const from = xaxis.p2l(x - LINE_HIT_PX);
  const to = xaxis.p2l(x + LINE_HIT_PX);
  let hit: LineHit | null = null;
  let nearest = LINE_HIT_PX;
  for (let curve = 0; curve < traces.length; curve++) {
    const times = traces[curve].x as ArrayLike<number> | undefined;
    const values = traces[curve].y as ArrayLike<number> | undefined;
    if (!times || !values) continue;
    // From the segment reaching into the pointer's span to the last starting in it.
    const first = Math.max(0, firstAtOrAfter(times, from) - 1);
    for (let k = first; k < times.length - 1 && times[k] <= to; k++) {
      const ax = xaxis.l2p(times[k]);
      const ay = yaxis.l2p(values[k]);
      const dx = xaxis.l2p(times[k + 1]) - ax;
      const dy = yaxis.l2p(values[k + 1]) - ay;
      const length2 = dx * dx + dy * dy;
      const along =
        length2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / length2)) : 0;
      const distance = Math.hypot(x - ax - along * dx, y - ay - along * dy);
      if (distance <= nearest) {
        nearest = distance;
        hit = {
          curve,
          time: times[k] + along * (times[k + 1] - times[k]),
          value: values[k] + along * (values[k + 1] - values[k]),
        };
      }
    }
  }
  return hit;
}

/** Where `value` falls in ascending `sorted`: the index of the first at or after it. */
function firstAtOrAfter(sorted: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

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
