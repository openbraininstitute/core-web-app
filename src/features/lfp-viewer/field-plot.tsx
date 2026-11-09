'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { COLOUR_TABLE } from '@/features/lfp-viewer/colour-scale';
import { contactColour } from '@/features/lfp-viewer/contact-colours';
import { rowTicks } from '@/features/lfp-viewer/field-structure';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { TIME_CURSOR_COLOR } from '@/features/sonata-viewer/time-cursor';
import { nextEventsHover, TimelineCard } from '@/features/spike-viewer/components/timeline-card';
import {
  computeTicks,
  drawTimelineMarks,
  formatTick,
  markerGroupAt,
} from '@/features/spike-viewer/renderer/axis-overlay';
import { TooltipCard } from '@/features/spike-viewer/spike-statistics/plot-tooltip';

import type { ReactNode } from 'react';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { FieldRow } from '@/features/lfp-viewer/field-structure';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { TraceRows } from '@/features/lfp-viewer/use-lfp-summary';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { MarkerGroup } from '@/features/spike-viewer/renderer/axis-overlay';
import type { EventsHover } from '@/features/spike-viewer/renderer/raster-renderer';

export type FieldPlotMode = 'traces' | 'map';

/** The traces' lanes on show, [first, end), and the plot's width in px. */
/** The lanes on show a screen at a time: the first of the screen the top one is in, and how many a screen holds. */
export type LanesInView = { first: number; perScreen: number; width: number };

const MARGIN = { left: 52, right: 10, top: 6, bottom: 22 };
const INK = '#002766';
const AXIS = '#bfbfbf';
const LABEL = '#8c8c8c';
/** Over the other traces while a row of the table is hovered, as a voltage report mutes its other lines. */
const HOVER_WASH = 'rgba(255, 255, 255, 0.6)';
const HOVERED_WIDTH = 2.5;
/** The hovered trace scrolled out of view is drawn at the edge it lies past, in a strip at least this high. */
const PEEK_PX = 28;
const PEEK_BACKDROP = 'rgba(255, 255, 255, 0.92)';
/** A hovered contact that isn't traced, as a voltage report greys its hovered cell's. */
const PREVIEW_COLOUR = '#8c8c8c';
/** Above a previewed map row, where it says it isn't ticked. */
const PREVIEW_TEXT_PX = 13;
/** A hovered map row is outlined at least this high, however thin its row. */
const MAP_ROW_MIN_PX = 4;
/** A drag shorter than this is a click. */
const DRAG_PX = 4;
/** A click this soon after another is a double-click's second, which zooms back out. */
const DOUBLE_CLICK_MS = 500;
/** A trace's label needs this much height; in lanes lower, only every few are labelled. */
const LABEL_PX = 11;
const NO_EVENTS: readonly TimelineEvent[] = [];

type Props = {
  mode: FieldPlotMode;
  field: LfpField;
  scale: ColourScale;
  /** The map's rows, top to bottom: each draws the mean of its contacts. */
  rows: readonly FieldRow[];
  /** The contacts drawn as traces, top to bottom. */
  traces: readonly number[];
  /** Whether the traces are the ticked contacts' alone, not every one's: a change starts them at the top. */
  tracingTicked: boolean;
  /** What each trace is called, in the order of `traces`. */
  traceLabels: readonly string[];
  /** The ticked contacts' colours, which their traces are drawn in. */
  colours: ReadonlyMap<number, string>;
  /** Traced contacts read over the window, finer than the overview; a lane not among them draws the overview's. */
  traceRows: TraceRows | null;
  /** The shortest window a drag zooms to. */
  minSpanMs: number;
  onLanesInView: (lanes: LanesInView) => void;
  /** How many times the shared gain the traces are drawn at. */
  gain: number;
  /** Each trace's height in px, the pane scrolling through them where they don't fit; null fits them all. */
  laneHeight: number | null;
  window: [number, number];
  onWindowChange: (window: [number, number] | null) => void;
  selectedContact: number | null;
  /** A trace clicked, or a map row's lead. */
  onContactClick: (contact: number) => void;
  /** The contact under the pointer: a trace's, or a map row's lead; null once it leaves. */
  onContactHover?: (contact: number | null) => void;
  /** The contact whose row of the table is hovered, its trace drawn over the rest. */
  hoveredContact: number | null;
  /** A contact's row of the table, as its hover card lists it. */
  contactRows: (contact: number) => { label: string; value: string }[];
  /** What a click on a contact's trace does, said at the foot of its card. */
  clickHint: (contact: number) => string;
  timeCursor: TimeCursor;
  /** When the simulation's stimuli, recordings and synaptic changes happen. */
  events: readonly TimelineEvent[];
  /** Under the plot, lined up with it: given the plot's left and right edges. */
  footer: (left: number, right: number) => ReactNode;
};

/** A contact's lowest and highest µV over bins [from, to). */
function extent(field: LfpField, contact: number, from: number, to: number): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  const row = contact * field.bins;
  if (field.kind !== 'min_max') {
    for (let b = from; b < to; b++) {
      const v = field.data[row + b];
      if (v < low) low = v;
      if (v > high) high = v;
    }
  } else {
    for (let b = from; b < to; b++) {
      const lo = field.data[(row + b) * 2];
      const hi = field.data[(row + b) * 2 + 1];
      if (lo < low) low = lo;
      if (hi > high) high = hi;
    }
  }
  return [low * field.scale, high * field.scale];
}

/** A pixel's span, stretched to meet the pixel's before it: a line moving fast skips between them. */
export function reachingPrevious(
  [low, high]: [number, number],
  [previousLow, previousHigh]: [number, number]
): [number, number] {
  return [Math.min(low, previousHigh), Math.max(high, previousLow)];
}

/** Whether lane `row` lies wholly above the lanes in view, wholly below, or shows; a contact not traced (-1), below. */
export function laneOffView(
  row: number,
  lane: number,
  scroll: number,
  viewHeight: number
): 'above' | 'below' | null {
  if (row < 0) return 'below';
  const top = row * lane - scroll;
  if (top + lane <= 0) return 'above';
  if (top >= viewHeight) return 'below';
  return null;
}

/** Where a map row is outlined: its own band, grown about its middle to `minHeight` where thinner, kept in the plot. */
export function mapRowBand(
  row: number,
  rows: number,
  plotTop: number,
  plotHeight: number,
  minHeight: number
): { top: number; height: number } {
  const rowHeight = plotHeight / rows;
  const height = Math.min(plotHeight, Math.max(minHeight, rowHeight));
  const middle = plotTop + (row + 0.5) * rowHeight;
  const top = Math.min(plotTop + plotHeight - height, Math.max(plotTop, middle - height / 2));
  return { top, height };
}

/** The map row that holds a contact; -1 for none. */
function rowWith(rows: readonly FieldRow[], contact: number | null): number {
  return contact === null ? -1 : rows.findIndex((row) => row.contacts.includes(contact));
}

/** A notch in the left margin at `y`, by a plot whose left edge is `left`. */
function marginNotch(g: CanvasRenderingContext2D, left: number, y: number, colour: string) {
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(left - 4, y);
  g.lineTo(left, y - 4);
  g.lineTo(left, y + 4);
  g.fill();
}

/** A name in the left margin, on a backdrop over the labels drawn there, from `top` for `height`. */
function marginName(
  g: CanvasRenderingContext2D,
  left: number,
  { top, height }: { top: number; height: number },
  text: string,
  colour: string
) {
  g.fillStyle = PEEK_BACKDROP;
  g.fillRect(0, top, left - 1, height);
  g.fillStyle = colour;
  g.font = 'bold 10px sans-serif';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(text, left - 6, top + height / 2);
}

/** A contact's name and notch in the left margin, at `y`. */
function marginMark(
  g: CanvasRenderingContext2D,
  left: number,
  y: number,
  text: string,
  colour: string
) {
  marginName(g, left - 4, { top: y - 7, height: 14 }, text, colour);
  marginNotch(g, left, y, colour);
}

/** A strip over the plot for what isn't among its lanes or rows, its dashed edge towards them. */
function peekStrip(
  g: CanvasRenderingContext2D,
  left: number,
  width: number,
  { top, height }: { top: number; height: number },
  edgeAtTop: boolean
) {
  g.fillStyle = PEEK_BACKDROP;
  g.fillRect(left, top, width, height);
  g.strokeStyle = AXIS;
  g.setLineDash([3, 3]);
  g.beginPath();
  const edge = edgeAtTop ? top + 0.5 : top + height - 0.5;
  g.moveTo(left, edge);
  g.lineTo(left + width, edge);
  g.stroke();
  g.setLineDash([]);
}

function notTicked(g: CanvasRenderingContext2D, left: number, top: number) {
  g.fillStyle = LABEL;
  g.font = '10px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('not ticked', left + 4, top + 3);
}

function heatColour(scale: ColourScale, uv: number): number {
  return COLOUR_TABLE[Math.round(((scale.position(uv) + 1) / 2) * 255)];
}

/** A pixel per row and bin over the whole run, in the map's colours; a window crops it. */
function heatImage(
  bins: number,
  rows: number,
  scale: ColourScale,
  valueAt: (row: number, bin: number) => number
): HTMLCanvasElement {
  const image = new ImageData(bins, rows);
  const pixels = new Uint32Array(image.data.buffer);
  for (let r = 0; r < rows; r++) {
    for (let b = 0; b < bins; b++) pixels[r * bins + b] = heatColour(scale, valueAt(r, b));
  }
  const canvas = document.createElement('canvas');
  canvas.width = bins;
  canvas.height = rows;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
  return canvas;
}

/** The bins `firstBin` to `lastBin` of a heat image, unsmoothed, into `box`. */
function drawHeat(
  g: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  [firstBin, lastBin]: [number, number],
  xOfBin: (bin: number) => number,
  box: { left: number; top: number; width: number; height: number }
) {
  const [x0, x1] = [xOfBin(firstBin), xOfBin(lastBin)];
  g.imageSmoothingEnabled = false;
  g.save();
  g.beginPath();
  g.rect(box.left, box.top, box.width, box.height);
  g.clip();
  g.drawImage(
    image,
    firstBin,
    0,
    lastBin - firstBin,
    image.height,
    x0,
    box.top,
    x1 - x0,
    box.height
  );
  g.restore();
}

function rowValue(field: LfpField, row: FieldRow, bin: number): number {
  let sum = 0;
  for (const contact of row.contacts) sum += fieldValue(field, contact, bin);
  return sum / row.contacts.length;
}

/** A canvas cleared for drawing at `size`, its backing store reallocated only when the size changed. */
function clearedCanvas(
  canvas: HTMLCanvasElement,
  size: { width: number; height: number }
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(size.width * dpr);
  const height = Math.floor(size.height * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, size.width, size.height);
  return g;
}

/** How the traces are drawn across the plot: from which field and bins, at what scale, between which x. */
type TraceDrawing = {
  source: LfpField;
  first: number;
  last: number;
  pxPerUv: number;
  xOf: (t: number) => number;
  left: number;
  width: number;
};

/**
 * Strokes row `at` of the drawing's field about `base`: through each bin where bins are wider than
 * pixels, else as each pixel's lowest to highest, so no peak is lost.
 */
function strokeTrace(g: CanvasRenderingContext2D, d: TraceDrawing, at: number, base: number) {
  const { source, first, last, pxPerUv, xOf, left, width } = d;
  const binsPerPx = (last - first) / width;
  // A window can fall between two bin centres: the bins either side carry the line across it.
  const lineFrom = Math.max(0, first - 1);
  const lineEnd = Math.min(source.bins, last + 1);
  g.beginPath();
  if (binsPerPx <= 1) {
    for (let b = lineFrom; b < lineEnd; b++) {
      const [low, high] = extent(source, at, b, b + 1);
      const x = xOf(source.start + (b + 0.5) * source.binMs);
      if (b === lineFrom) g.moveTo(x, base - high * pxPerUv);
      else g.lineTo(x, base - high * pxPerUv);
      g.lineTo(x, base - low * pxPerUv);
    }
  } else {
    let previous: [number, number] = [-Infinity, Infinity];
    for (let px = 0; px < width; px++) {
      const b0 = first + Math.floor(px * binsPerPx);
      const b1 = Math.min(last, Math.max(b0 + 1, first + Math.floor((px + 1) * binsPerPx)));
      const span = extent(source, at, b0, b1);
      const [low, high] = reachingPrevious(span, previous);
      g.moveTo(left + px + 0.5, base - high * pxPerUv);
      g.lineTo(left + px + 0.5, base - low * pxPerUv + 0.5);
      previous = span;
    }
  }
  g.stroke();
}

/** Where the pointer is over the plot, and what its card says there. */
type PlotHover = {
  clientX: number;
  clientY: number;
  title: string;
  subtitle?: string;
  note?: string;
  swatch?: string;
  time: number;
  uv: number;
  /** The trace's contact, or the map row's lead. */
  contact: number;
  /** Whether the card lists the contact's row of the table: not for a map row of several. */
  listed: boolean;
};

/** The bins of a field over [from, to) ms, clamped to the run. */
function binRange(field: LfpField, from: number, to: number): [number, number] {
  return [
    Math.max(0, Math.floor((from - field.start) / field.binMs)),
    Math.min(field.bins, Math.ceil((to - field.start) / field.binMs)),
  ];
}

/**
 * The field over time: stacked traces of a few contacts, each drawn as its
 * lowest-to-highest value per pixel so no peak is lost, or rows of colour, each
 * a contact or the mean of several. Dragging zooms into a span of time, a
 * double-click zooms back out, and a click picks the trace's contact, or the
 * map row's.
 */
export function FieldPlot({
  mode,
  field,
  scale,
  rows,
  traces,
  tracingTicked,
  traceLabels,
  colours,
  traceRows,
  minSpanMs,
  onLanesInView,
  gain,
  laneHeight,
  window: [from, to],
  onWindowChange,
  selectedContact,
  onContactClick,
  onContactHover,
  hoveredContact,
  contactRows,
  clickHint,
  timeCursor,
  events,
  footer,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null);
  const [hover, setHover] = useState<PlotHover | null>(null);
  const marksRef = useRef<HTMLCanvasElement>(null);
  const groupsRef = useRef<MarkerGroup[]>([]);
  const [eventsHover, setEventsHover] = useState<EventsHover | null>(null);
  const hoveredEvents = eventsHover?.group.events ?? NO_EVENTS;

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: box.clientWidth, height: box.clientHeight })
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const right = Math.max(MARGIN.left + 1, size.width - MARGIN.right);
  const bottom = Math.max(MARGIN.top + 1, size.height - MARGIN.bottom);
  const plot = {
    left: MARGIN.left,
    right,
    top: MARGIN.top,
    bottom,
    width: right - MARGIN.left,
    height: bottom - MARGIN.top,
  };
  const xOf = (t: number) => plot.left + ((t - from) / (to - from)) * plot.width;
  const timeOf = (x: number) => from + ((x - plot.left) / plot.width) * (to - from);
  const rowCount = mode === 'map' ? rows.length : traces.length;
  // The traces' lanes, which scroll where they don't fit.
  const lane = laneHeight ?? plot.height / Math.max(1, traces.length);
  const lanesHeight = traces.length * lane;
  const maxScroll = mode === 'traces' ? Math.max(0, lanesHeight - plot.height) : 0;
  const [chosenScroll, setScroll] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only going between every contact and the ticked
  useEffect(() => setScroll(0), [tracingTicked]);
  const scroll = Math.min(chosenScroll, maxScroll);
  // Scrolling, the lanes are cut at the plot's edges; all on show, gain may take them past.
  const clipTop = maxScroll > 0 ? plot.top : 0;
  const clipHeight = maxScroll > 0 ? plot.height : size.height;
  const laneY = (row: number) => plot.top + (row + 0.5) * lane - scroll;
  const firstLane = Math.max(0, Math.floor(scroll / lane) - 1);
  const endLane = Math.min(traces.length, Math.ceil((scroll + plot.height) / lane) + 1);
  const perScreen = Math.max(1, Math.ceil(plot.height / lane));
  const screenFirst = Math.floor(Math.floor(scroll / lane) / perScreen) * perScreen;
  const traceDrawing = (source: LfpField): TraceDrawing => {
    const [first, last] = binRange(source, from, to);
    return {
      source,
      first,
      last,
      // The scale's limit spans most of a row; more gain lets traces overlap, as raw data does.
      pxPerUv: (lane * 0.45 * gain) / scale.limit,
      xOf,
      left: plot.left,
      width: plot.width,
    };
  };
  /** A contact's lane: its row read over the window where it is in, else the overview's. */
  const laneSource = (contact: number): [LfpField, number] => {
    const at = traceRows?.rows.get(contact);
    return traceRows && at !== undefined ? [traceRows.field, at] : [field, contact];
  };
  const laneStroker = () => {
    const overview = traceDrawing(field);
    const read = traceRows && traceDrawing(traceRows.field);
    return (g: CanvasRenderingContext2D, contact: number, y: number) => {
      const [source, at] = laneSource(contact);
      strokeTrace(g, read && source !== field ? read : overview, at, y);
    };
  };
  const laneValue = (contact: number, time: number) => {
    const [source, at] = laneSource(contact);
    return fieldValue(source, at, binAt(source, time));
  };
  const xOfBin = (bin: number) => xOf(field.start + bin * field.binMs);
  const hoveredLane = hoveredContact === null ? -1 : traces.indexOf(hoveredContact);
  const hoveredColour =
    (hoveredLane >= 0 && contactColour(colours, selectedContact, traces[hoveredLane])) || INK;

  useEffect(() => {
    if (mode === 'traces') onLanesInView({ first: screenFirst, perScreen, width: plot.width });
  }, [mode, screenFirst, perScreen, plot.width, onLanesInView]);

  // None below the last lane, where lanes of a fixed height leave the plot empty.
  const rowOf = (y: number): number | null => {
    if (mode === 'map') {
      return Math.min(
        rowCount - 1,
        Math.max(0, Math.floor(((y - plot.top) / plot.height) * rowCount))
      );
    }
    const r = Math.floor((y - plot.top + scroll) / lane);
    return r >= 0 && r < rowCount ? r : null;
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box || maxScroll === 0) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      setScroll((s) => Math.min(maxScroll, Math.max(0, Math.min(s, maxScroll) + e.deltaY)));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [maxScroll]);

  // A contact picked elsewhere is scrolled into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new pick scrolls, not a scroll of the user's
  useEffect(() => {
    const row = selectedContact === null ? -1 : traces.indexOf(selectedContact);
    if (row < 0 || maxScroll === 0) return;
    const y = row * lane;
    if (y < scroll || y + lane > scroll + plot.height) {
      setScroll(Math.min(maxScroll, Math.max(0, y - (plot.height - lane) / 2)));
    }
  }, [selectedContact]);

  const mapImage = useMemo(() => {
    if (mode !== 'map' || field.bins === 0 || typeof document === 'undefined') return null;
    return heatImage(field.bins, rows.length, scale, (r, b) => rowValue(field, rows[r], b));
  }, [mode, field, scale, rows]);
  // A contact of the table hovered that the map has no row of, as while others are ticked.
  const previewed =
    mode === 'map' && hoveredContact !== null && rowWith(rows, hoveredContact) < 0
      ? hoveredContact
      : null;
  const previewImage = useMemo(() => {
    if (previewed === null || field.bins === 0 || typeof document === 'undefined') return null;
    return heatImage(field.bins, 1, scale, (_, b) => fieldValue(field, previewed, b));
  }, [previewed, field, scale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: xOf and the plot's edges follow from size, from and to
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const g = clearedCanvas(canvas, size);
    if (!g) return;
    g.font = '10px sans-serif';
    const { width: plotWidth, height: plotHeight } = plot;

    const [firstBin, lastBin] = binRange(field, from, to);
    if (mode === 'map' && mapImage && lastBin > firstBin) {
      drawHeat(g, mapImage, [firstBin, lastBin], xOfBin, plot);
      g.fillStyle = LABEL;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      const rowY = (r: number) => plot.top + ((r + 0.5) / rows.length) * plotHeight;
      for (const tick of rowTicks(rows, plotHeight / 40)) {
        g.fillText(tick.label, plot.left - 6, rowY(tick.row));
      }
      // In a ticked contact's colour, or the selected one's, as the traces draw them.
      rows.forEach((row, r) => {
        const colour = row.contacts
          .map((c) => contactColour(colours, selectedContact, c))
          .find(Boolean);
        if (colour) marginNotch(g, plot.left, rowY(r), colour);
      });
    }

    if (mode === 'traces' && traces.length > 0) {
      const inView = (row: number) => row >= firstLane && row < endLane;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      const labelEvery = Math.max(1, Math.ceil(LABEL_PX / lane));
      g.save();
      g.beginPath();
      g.rect(0, clipTop, plot.left, clipHeight);
      g.clip();
      for (let row = firstLane; row < endLane; row++) {
        if (row % labelEvery !== 0) continue;
        g.fillStyle = contactColour(colours, selectedContact, traces[row]) ?? LABEL;
        g.fillText(traceLabels[row], plot.left - 6, laneY(row));
      }
      g.restore();
      const strokeLane = laneStroker();
      g.save();
      g.beginPath();
      g.rect(plot.left, clipTop, plotWidth, clipHeight);
      g.clip();
      // The ticked last, so that they lie over the others where gain makes them meet.
      const drawOrder = traces
        .map((_, row) => row)
        .filter(inView)
        .sort((a, b) => Number(colours.has(traces[a])) - Number(colours.has(traces[b])));
      for (const row of drawOrder) {
        const contact = traces[row];
        g.strokeStyle = contactColour(colours, selectedContact, contact) ?? INK;
        g.lineWidth = colours.has(contact) ? 1.5 : 1;
        strokeLane(g, contact, laneY(row));
      }
      g.restore();
    }

    // The time axis.
    g.strokeStyle = AXIS;
    g.beginPath();
    g.moveTo(plot.left, plot.bottom + 0.5);
    g.lineTo(plot.right, plot.bottom + 0.5);
    g.stroke();
    g.fillStyle = LABEL;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const ticks = computeTicks(from, to, plotWidth / 80);
    const tickStep = ticks.length > 1 ? ticks[1] - ticks[0] : to - from;
    const unitLeft = size.width - 2 - g.measureText('ms').width - 4;
    for (const t of ticks) {
      const x = xOf(t);
      g.beginPath();
      g.moveTo(x, plot.bottom);
      g.lineTo(x, plot.bottom + 4);
      g.stroke();
      const label = formatTick(t, tickStep);
      if (x + g.measureText(label).width / 2 <= unitLeft) g.fillText(label, x, plot.bottom + 6);
    }
    g.textAlign = 'right';
    g.fillText('ms', size.width - 2, plot.bottom + 6);
  }, [
    size,
    mode,
    mapImage,
    rows,
    field,
    scale,
    traces,
    traceLabels,
    colours,
    traceRows,
    gain,
    lane,
    scroll,
    maxScroll,
    from,
    to,
    selectedContact,
  ]);

  // On a canvas of its own, so that hovering rows of the table doesn't draw every trace anew.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the drawing and the lanes follow from these
  useEffect(() => {
    const canvas = hoverCanvasRef.current;
    if (!canvas || size.width === 0) return;
    const g = clearedCanvas(canvas, size);
    if (!g) return;
    if (mode === 'map') {
      // The table's row hovered, or the map's own under the pointer, as the spike raster marks its cell's.
      const contact = hoveredContact ?? hover?.contact ?? null;
      const row = rowWith(rows, contact);
      if (row < 0) {
        const [firstBin, lastBin] = binRange(field, from, to);
        if (contact === null || !previewImage || lastBin <= firstBin) return;
        // At the foot, as the traces show a contact they don't draw.
        const strip = Math.min(plot.height / 2, Math.max(PEEK_PX, plot.height / rows.length));
        const top = plot.bottom - strip;
        const heatTop = top + PREVIEW_TEXT_PX;
        peekStrip(g, plot.left, plot.width, { top, height: strip }, true);
        drawHeat(g, previewImage, [firstBin, lastBin], xOfBin, {
          left: plot.left,
          top: heatTop,
          width: plot.width,
          height: plot.bottom - heatTop,
        });
        notTicked(g, plot.left, top);
        marginMark(g, plot.left, (heatTop + plot.bottom) / 2, `e${contact}`, PREVIEW_COLOUR);
        return;
      }
      const band = mapRowBand(row, rows.length, plot.top, plot.height, MAP_ROW_MIN_PX);
      // White inside ink, so that it shows on either end of the colour scale.
      g.lineWidth = 1;
      g.strokeStyle = '#ffffff';
      g.strokeRect(plot.left + 1.5, band.top + 1.5, plot.width - 3, band.height - 3);
      g.strokeStyle = INK;
      g.strokeRect(plot.left + 0.5, band.top + 0.5, plot.width - 1, band.height - 1);
      const y = band.top + band.height / 2;
      // The table's contact by its name; the map's own row by its label, which may be of several.
      const name = hoveredContact !== null ? `e${hoveredContact}` : rows[row].label;
      marginMark(g, plot.left, y, name, INK);
      return;
    }
    if (hoveredContact === null) return;
    const row = hoveredLane;
    const contact = hoveredContact;
    // Not traced, as only the ticked are: shown at the foot, in grey, as a voltage report shows its hovered cell.
    const off = laneOffView(row, lane, scroll, plot.height);
    g.save();
    g.beginPath();
    g.rect(plot.left, clipTop, plot.width, clipHeight);
    g.clip();
    // Over the plot alone, not its time axis, though the trace may reach past it as on the traces' canvas.
    g.fillStyle = HOVER_WASH;
    g.fillRect(plot.left, plot.top, plot.width, plot.height);
    // Scrolled out of view, it is drawn at the edge it lies past, and the lanes stay where they are.
    const strip = Math.min(plot.height / 2, Math.max(PEEK_PX, lane));
    const stripTop = off === 'above' ? plot.top : plot.bottom - strip;
    if (off) {
      peekStrip(g, plot.left, plot.width, { top: stripTop, height: strip }, off === 'below');
      // Kept to its strip, however far gain swings it, so that it reads apart from the lanes.
      g.beginPath();
      g.rect(plot.left, stripTop, plot.width, strip);
      g.clip();
    }
    const y = off ? stripTop + strip / 2 : laneY(row);
    const colour = row < 0 ? PREVIEW_COLOUR : hoveredColour;
    g.strokeStyle = colour;
    g.lineWidth = HOVERED_WIDTH;
    laneStroker()(g, contact, y);
    if (row < 0) notTicked(g, plot.left, stripTop);
    g.restore();
    if (off) {
      const text = row < 0 ? `e${contact}` : `${traceLabels[row]} ${off === 'above' ? '↑' : '↓'}`;
      marginName(g, plot.left, { top: stripTop, height: strip }, text, colour);
    }
  }, [
    hoveredContact,
    hover?.contact,
    size,
    mode,
    rows,
    traces,
    traceLabels,
    colours,
    selectedContact,
    traceRows,
    field,
    gain,
    scale,
    lane,
    scroll,
    maxScroll,
    from,
    to,
    previewImage,
  ]);

  const hoverContact = hover?.contact ?? null;
  // Taken back once it moves on, or the plot goes from under the pointer.
  useEffect(() => {
    if (hoverContact === null) return;
    onContactHover?.(hoverContact);
    return () => onContactHover?.(null);
  }, [hoverContact, onContactHover]);
  const lastClickRef = useRef(Number.NEGATIVE_INFINITY);

  // On a canvas of their own: a hover draws their bands anew, which needn't draw the traces.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the plot's edges follow from size
  useEffect(() => {
    const canvas = marksRef.current;
    if (!canvas || size.width === 0) return;
    groupsRef.current = drawTimelineMarks(
      canvas,
      from,
      to,
      plot.width,
      plot.height,
      events,
      hoveredEvents
    );
  }, [size, from, to, events, hoveredEvents]);

  // The player's time, moved outside React.
  // biome-ignore lint/correctness/useExhaustiveDependencies: xOf follows from size, from and to
  useEffect(
    () =>
      timeCursor.subscribe((t) => {
        const el = cursorRef.current;
        if (!el) return;
        const visible = t !== null && t >= from && t <= to;
        el.style.display = visible ? 'block' : 'none';
        if (visible) el.style.left = `${xOf(t)}px`;
      }),
    [timeCursor, from, to, size]
  );

  const localX = (e: React.PointerEvent) =>
    e.clientX - (boxRef.current?.getBoundingClientRect().left ?? 0);
  const localY = (e: React.PointerEvent) =>
    e.clientY - (boxRef.current?.getBoundingClientRect().top ?? 0);
  const inPlot = (x: number) => Math.min(plot.right, Math.max(plot.left, x));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={boxRef}
        className="relative min-h-0 flex-1 cursor-crosshair select-none"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const x = inPlot(localX(e));
          setDrag({ x0: x, x1: x });
        }}
        onPointerMove={(e) => {
          const x = localX(e);
          const y = localY(e);
          if (drag) setDrag({ ...drag, x1: inPlot(x) });
          const group = drag
            ? undefined
            : markerGroupAt(groupsRef.current, x - plot.left, y - plot.top, plot);
          setEventsHover((previous) => nextEventsHover(previous, group, e.clientX, e.clientY));
          const r =
            x < plot.left || x > plot.right || y < plot.top || y > plot.bottom || rowCount === 0
              ? null
              : rowOf(y);
          if (r === null) {
            setHover(null);
            return;
          }
          const time = timeOf(x);
          const at = { clientX: e.clientX, clientY: e.clientY, time };
          if (mode === 'map') {
            const row = rows[r];
            setHover({
              ...at,
              title: row.label,
              note: row.contacts.length > 1 ? `${row.contacts.length} contacts` : undefined,
              uv: rowValue(field, row, binAt(field, time)),
              contact: row.lead,
              listed: row.contacts.length === 1,
            });
          } else {
            const contact = traces[r];
            const label = traceLabels[r];
            setHover({
              ...at,
              title: `e${contact}`,
              subtitle: label === `e${contact}` ? undefined : label,
              swatch: contactColour(colours, selectedContact, contact) ?? INK,
              uv: laneValue(contact, time),
              contact,
              listed: true,
            });
          }
        }}
        onPointerLeave={() => {
          setHover(null);
          setEventsHover(null);
        }}
        onPointerUp={(e) => {
          if (!drag) return;
          setDrag(null);
          // From the event, as the last move may not have been drawn yet.
          const x1 = inPlot(localX(e));
          if (Math.abs(x1 - drag.x0) < DRAG_PX) {
            const y = localY(e);
            const r = rowCount === 0 || y < plot.top || y > plot.bottom ? null : rowOf(y);
            if (r === null) return;
            // The second of a double-click would take back what the first selected.
            if (e.timeStamp - lastClickRef.current < DOUBLE_CLICK_MS) {
              lastClickRef.current = Number.NEGATIVE_INFINITY;
              return;
            }
            lastClickRef.current = e.timeStamp;
            onContactClick(mode === 'map' ? rows[r].lead : traces[r]);
            return;
          }
          const a = timeOf(Math.min(drag.x0, x1));
          const b = timeOf(Math.max(drag.x0, x1));
          if (b - a >= minSpanMs) onWindowChange([a, b]);
        }}
        onDoubleClick={() => onWindowChange(null)}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={hoverCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <canvas
          ref={marksRef}
          className="pointer-events-none absolute"
          style={{
            left: plot.left,
            top: plot.top,
            width: plot.width,
            height: plot.height,
          }}
        />
        <div
          ref={cursorRef}
          className="pointer-events-none absolute w-px"
          style={{
            top: plot.top,
            height: plot.height,
            background: TIME_CURSOR_COLOR,
            display: 'none',
          }}
        />
        {maxScroll > 0 && (
          <ScrollThumb
            top={plot.top}
            height={plot.height}
            scroll={scroll}
            total={lanesHeight}
            onScroll={(s) => setScroll(Math.min(maxScroll, Math.max(0, s)))}
            mark={
              mode === 'traces' && hoveredLane >= 0
                ? { at: (hoveredLane + 0.5) * lane, colour: hoveredColour }
                : null
            }
          />
        )}
        {drag && Math.abs(drag.x1 - drag.x0) >= DRAG_PX && (
          <div
            className="bg-primary-9/10 border-primary-9/40 pointer-events-none absolute border-x"
            style={{
              left: Math.min(drag.x0, drag.x1),
              width: Math.abs(drag.x1 - drag.x0),
              top: plot.top,
              height: plot.height,
            }}
          />
        )}
        {eventsHover && <TimelineCard hover={eventsHover} />}
        {hover && !eventsHover && !drag && (
          <TooltipCard
            clientX={hover.clientX}
            clientY={hover.clientY}
            card={{
              title: hover.title,
              note: hover.note,
              subtitle: hover.subtitle,
              swatch: hover.swatch,
              rows: [
                { label: 'Time', value: `${hover.time.toFixed(2)} ms` },
                { label: 'Field', value: `${hover.uv.toFixed(2)} µV`, strong: true },
                ...(hover.listed ? contactRows(hover.contact) : []),
              ],
              hint: clickHint(hover.contact),
            }}
          />
        )}
      </div>
      {size.width > 0 && footer(plot.left, plot.right)}
    </div>
  );
}

/** Where the lanes on show lie among all of them, in the plot's right margin: dragged, it scrolls them. */
function ScrollThumb({
  top,
  height,
  scroll,
  total,
  onScroll,
  mark,
}: {
  top: number;
  height: number;
  scroll: number;
  total: number;
  onScroll: (scroll: number) => void;
  /** A point among the lanes, in px from the first's top, marked on the track: in the thumb wherever it is on show. */
  mark: { at: number; colour: string } | null;
}) {
  const [grab, setGrab] = useState<{ y: number; scroll: number } | null>(null);
  const thumb = Math.max(16, (height * height) / total);
  const room = Math.max(1, height - thumb);
  const perPx = room / Math.max(1, total - height);
  return (
    <>
      <div
        aria-hidden
        className={`absolute right-0.5 w-1.5 cursor-grab rounded-full ${grab ? 'bg-neutral-400' : 'bg-neutral-300 hover:bg-neutral-400'}`}
        style={{ top: top + scroll * perPx, height: thumb }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          setGrab({ y: e.clientY, scroll });
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (grab) onScroll(grab.scroll + (e.clientY - grab.y) / perPx);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setGrab(null);
        }}
      />
      {mark && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 h-0.5 w-2.5 rounded-full"
          style={{ top: top + mark.at * perPx - 1, background: mark.colour }}
        />
      )}
    </>
  );
}
