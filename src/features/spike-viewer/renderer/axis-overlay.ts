import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';

export type ViewBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type PlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// The top band is clearance for the controls floating in the pane's top-right:
// an h-8 button and a little air, so the icons never sit on the spikes. Only
// each axis's two end ticks are labelled, and its title takes the space
// between them, so the bottom and left bands hold one row of text each.
export const MARGIN = { top: 36, right: 20, bottom: 28, left: 56 };

/**
 * How the y axis reads when its rows are not node ids: runs of rows under a
 * label each, such as a layer, or a value at each row, such as a rate.
 */
export type RowAxis = {
  title: string;
  groups?: { label: string; start: number; end: number }[];
  valueAt?: (row: number) => string;
};

/** The config's timings: stimuli in amber, recordings in slate, synaptic changes in violet. */
export const TIMELINE_COLORS = {
  stimulus: '#f59e0b',
  stimulusBand: 'rgba(245, 158, 11, 0.1)',
  stimulusText: '#b45309',
  recording: '#94a3b8',
  manipulation: '#7c3aed',
};

/** Compute nice tick values for an axis range. When integer is true, step is constrained to an integer >= 1. */
function computeTicks(min: number, max: number, targetCount: number, integer = false): number[] {
  const range = max - min;
  if (range <= 0) return [min];

  const rawStep = range / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3.5) niceStep = 2 * magnitude;
  else if (residual <= 7.5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  if (integer) niceStep = Math.max(1, Math.round(niceStep));

  const ticks: number[] = [];
  const start = Math.ceil(min / niceStep) * niceStep;
  for (let v = start; v <= max + niceStep * 0.001; v += niceStep) {
    ticks.push(v);
  }
  return ticks;
}

/** Format a tick value to a reasonable number of decimal places. */
function formatTick(value: number, step: number): string {
  if (step >= 1) return Math.round(value).toString();
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return value.toFixed(decimals);
}

export class AxisOverlay {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  draw(
    bounds: ViewBounds,
    plotRect: PlotRect,
    rows?: RowAxis,
    events: readonly TimelineEvent[] = []
  ) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    const xTickCount = Math.max(2, Math.floor(plotRect.width / 80));
    const yTickCount = Math.max(2, Math.floor(plotRect.height / 30));
    const xTicks = computeTicks(bounds.xMin, bounds.xMax, xTickCount);
    const yTicks = computeTicks(bounds.yMin, bounds.yMax, yTickCount, true).filter((v) => v >= 0);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    this.drawBackground(ctx, plotRect);
    this.drawGrid(ctx, bounds, plotRect, xTicks);
    if (events.length > 0) this.drawEvents(ctx, bounds, plotRect, events);
    this.drawAxes(ctx, bounds, plotRect, xTicks, yTicks, rows);
    // Groups label the axis all along, where the title would sit on them.
    this.drawAxisTitles(ctx, plotRect, rows?.groups ? null : (rows?.title ?? 'Neuron ID'));

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, rect: PlotRect) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    xTicks: number[]
  ) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (const v of xTicks) {
      const px = rect.x + ((v - bounds.xMin) / (bounds.xMax - bounds.xMin)) * rect.width;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.height);
    }

    ctx.stroke();
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    xTicks: number[],
    yTicks: number[],
    rows: RowAxis | undefined
  ) {
    const xRange = bounds.xMax - bounds.xMin;
    const yRange = bounds.yMax - bounds.yMin;
    const xStep = xTicks.length > 1 ? xTicks[1] - xTicks[0] : 1;
    const yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;

    // Axis lines
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.height);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x, rect.y + rect.height);
    ctx.stroke();

    // X-axis ticks and labels
    ctx.fillStyle = '#333333';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    xTicks.forEach((v, i) => {
      const px = rect.x + ((v - bounds.xMin) / xRange) * rect.width;
      ctx.beginPath();
      ctx.moveTo(px, rect.y + rect.height);
      ctx.lineTo(px, rect.y + rect.height + 5);
      ctx.stroke();
      if (i === 0 || i === xTicks.length - 1) {
        ctx.fillText(formatTick(v, xStep), px, rect.y + rect.height + 8);
      }
    });

    // Y-axis ticks and labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    if (rows?.groups) {
      this.drawGroups(ctx, bounds, rect, rows.groups);
      return;
    }
    yTicks.forEach((v, i) => {
      // Rows run down from the top.
      const py = rect.y + ((v - bounds.yMin) / yRange) * rect.height;
      ctx.beginPath();
      ctx.moveTo(rect.x - 5, py);
      ctx.lineTo(rect.x, py);
      ctx.stroke();
      if (i === 0 || i === yTicks.length - 1) {
        ctx.fillText(rows?.valueAt ? rows.valueAt(v) : formatTick(v, yStep), rect.x - 8, py);
      }
    });
  }

  /** Behind the spikes: a dashed rule from each synaptic change's onset. */
  private drawEvents(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    events: readonly TimelineEvent[]
  ) {
    const xAt = (t: number) =>
      rect.x + ((t - bounds.xMin) / (bounds.xMax - bounds.xMin)) * rect.width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.strokeStyle = TIMELINE_COLORS.manipulation;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (const e of events) {
      if (e.kind !== 'manipulation') continue;
      const px = Math.round(xAt(e.start)) + 0.5;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.height);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** A rule between groups of rows, and each group's label beside its middle where it fits. */
  private drawGroups(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    groups: NonNullable<RowAxis['groups']>
  ) {
    const yAt = (row: number) =>
      rect.y + ((row - bounds.yMin) / (bounds.yMax - bounds.yMin)) * rect.height;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    ctx.save();
    ctx.strokeStyle = '#d4d4d4';
    ctx.beginPath();
    for (const group of groups.slice(1)) {
      const py = Math.round(yAt(group.start - 0.5)) + 0.5;
      if (py <= top || py >= bottom) continue;
      ctx.moveTo(rect.x - 5, py);
      ctx.lineTo(rect.x + rect.width, py);
    }
    ctx.stroke();

    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    const room = MARGIN.left - 12;
    for (const group of groups) {
      const edges = [yAt(group.start - 0.5), yAt(group.end - 0.5)];
      const from = Math.max(top, Math.min(...edges));
      const to = Math.min(bottom, Math.max(...edges));
      if (to - from < 11) continue;
      ctx.fillText(fitted(ctx, group.label, room), rect.x - 8, (from + to) / 2);
    }
    ctx.restore();
  }

  /** On the tick labels' own rows, midway between the two that are drawn. */
  private drawAxisTitles(ctx: CanvasRenderingContext2D, rect: PlotRect, yTitle: string | null) {
    ctx.fillStyle = '#333333';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

    // X-axis title, level with the end labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time (ms)', rect.x + rect.width / 2, rect.y + rect.height + 8);

    if (yTitle === null) return;
    // Y-axis title, rotated, flush with the end labels' right edge
    ctx.save();
    ctx.translate(rect.x - 8, rect.y + rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(yTitle, 0, 0);
    ctx.restore();
  }
}

/** The text, cut short with an ellipsis where it is wider than `width`. */
function fitted(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > width) end -= 1;
  return `${text.slice(0, end)}…`;
}

/** The bands along the plot's top and bottom holding the markers, which a hover there reads first. */
export const EVENT_TOP_ZONE_PX = 18;
export const EVENT_BOTTOM_ZONE_PX = 10;
/** How near a marker, sideways, a pointer has to be to read it. */
export const EVENT_HIT_PX = 7;

/**
 * Markers that fall in one place along the axis - onsets, or offsets, along
 * the top or along the bottom - read as one: one marker, one name ("Multi"
 * for several blocks), one hover for all of them.
 */
export type MarkerGroup = {
  events: TimelineEvent[];
  edge: 'start' | 'end';
  /** Along the top (stimuli, changes) or along the bottom (recordings). */
  top: boolean;
  time: number;
  /** Across the plot, in px. */
  x: number;
  /** Where its name was drawn, if it was. */
  label?: { x: number; width: number };
};

/** How near, sideways, markers have to fall to be read as one. */
const GROUP_PX = 3;
const MIXED_COLOR = '#475569';

function markerGroups(
  events: readonly TimelineEvent[],
  view: ViewBounds,
  width: number
): MarkerGroup[] {
  const xAt = (t: number) => ((t - view.xMin) / (view.xMax - view.xMin)) * width;
  const marks: { event: TimelineEvent; edge: 'start' | 'end'; top: boolean; time: number }[] = [];
  for (const event of events) {
    const top = event.kind !== 'recording';
    marks.push({ event, edge: 'start', top, time: event.start });
    if (event.end !== undefined && event.end > event.start) {
      marks.push({ event, edge: 'end', top, time: event.end });
    }
  }
  marks.sort(
    (a, b) => Number(a.top) - Number(b.top) || a.edge.localeCompare(b.edge) || a.time - b.time
  );
  const groups: MarkerGroup[] = [];
  for (const mark of marks) {
    const x = xAt(mark.time);
    const last = groups.at(-1);
    if (last && last.top === mark.top && last.edge === mark.edge && x - last.x <= GROUP_PX) {
      last.events.push(mark.event);
    } else {
      groups.push({ events: [mark.event], edge: mark.edge, top: mark.top, time: mark.time, x });
    }
  }
  return groups.filter((g) => g.x >= -6 && g.x <= width + 6);
}

/** What a group's name says: its block's, or "Multi" for several. */
export function groupName(group: MarkerGroup): string {
  const names = new Set(group.events.map((e) => e.name));
  return names.size === 1 ? group.events[0].name : 'Multi';
}

function groupColor(group: MarkerGroup): string {
  const kinds = new Set(group.events.map((e) => e.kind));
  if (kinds.size > 1) return MIXED_COLOR;
  const [kind] = kinds;
  return kind === 'stimulus'
    ? TIMELINE_COLORS.stimulus
    : kind === 'recording'
      ? TIMELINE_COLORS.recording
      : TIMELINE_COLORS.manipulation;
}

/**
 * Over the spikes, on a canvas laid over the plot area alone: a filled marker
 * at each onset and a hollow one at each offset - stimuli and changes along
 * the top, recordings along the bottom - and the names of the onsets along
 * the top where they fit before the next marker, on white so the spikes under
 * them do not muddle them. Only the blocks under the pointer show their whole
 * windows, as bands: a stimulus lasting the whole run would otherwise tint all
 * of it. Returns the groups as drawn, for a hover to find.
 */
export function drawEventMarks(
  ctx: CanvasRenderingContext2D,
  view: ViewBounds,
  width: number,
  height: number,
  events: readonly TimelineEvent[],
  hovered: readonly TimelineEvent[]
): MarkerGroup[] {
  const xAt = (t: number) => ((t - view.xMin) / (view.xMax - view.xMin)) * width;

  // A window shared by several blocks is drawn once: stacked, the bands would bury the spikes.
  const drawn = new Set<string>();
  for (const e of hovered) {
    const window = `${e.kind}:${e.start}:${e.end}`;
    if (drawn.has(window)) continue;
    drawn.add(window);
    const x0 = xAt(e.start);
    const x1 = e.end === undefined ? width : xAt(e.end);
    const w = Math.max(2, x1 - x0);
    if (e.kind === 'stimulus') {
      ctx.fillStyle = TIMELINE_COLORS.stimulusBand;
      ctx.fillRect(x0, 0, w, height);
      ctx.fillStyle = TIMELINE_COLORS.stimulus;
      ctx.fillRect(x0, 0, w, 3);
    } else if (e.kind === 'recording') {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.fillRect(x0, 0, w, height);
      ctx.fillStyle = TIMELINE_COLORS.recording;
      ctx.fillRect(x0, height - 3, w, 3);
    } else {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.07)';
      ctx.fillRect(x0, 0, w, height);
    }
  }

  const groups = markerGroups(events, view, width);
  for (const g of groups) {
    const color = groupColor(g);
    const y = g.top ? 0 : height;
    const tip = g.top ? 7 : -7;
    ctx.beginPath();
    ctx.moveTo(g.x - 4.5, y);
    ctx.lineTo(g.x + 4.5, y);
    ctx.lineTo(g.x, y + tip);
    ctx.closePath();
    if (g.edge === 'start') {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // An offset: the same marker, hollow.
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const top = groups.filter((g) => g.top);
  let clear = Number.NEGATIVE_INFINITY;
  top.forEach((g, i) => {
    if (g.edge !== 'start') return;
    const name = groupName(g);
    const x = g.x + 6;
    const next = top.slice(i + 1).find((later) => later.x > g.x + GROUP_PX);
    const room = (next ? next.x - 6 : width) - x;
    const textWidth = ctx.measureText(name).width;
    if (x < clear || x < 0 || textWidth + 6 > room) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x, 2, textWidth + 6, 13, 4);
    ctx.fill();
    const color = groupColor(g);
    ctx.fillStyle = color === TIMELINE_COLORS.stimulus ? TIMELINE_COLORS.stimulusText : color;
    ctx.fillText(name, x + 3, 8.5);
    g.label = { x, width: textWidth + 6 };
    clear = x + textWidth + 12;
  });
  return groups;
}
