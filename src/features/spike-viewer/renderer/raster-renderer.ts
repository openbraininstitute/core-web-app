import {
  AxisOverlay,
  drawEventMarks,
  EVENT_BOTTOM_ZONE_PX,
  EVENT_HIT_PX,
  EVENT_TOP_ZONE_PX,
  MARGIN,
} from '@/features/spike-viewer/renderer/axis-overlay';
import { InteractionManager } from '@/features/spike-viewer/renderer/interaction';
import { WebGLPoints } from '@/features/spike-viewer/renderer/webgl-points';

import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type {
  MarkerGroup,
  PlotRect,
  RowAxis,
  ViewBounds,
} from '@/features/spike-viewer/renderer/axis-overlay';
import type { HoverInfo } from '@/features/spike-viewer/renderer/interaction';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

export const POPULATION_COLORS = [
  '#1f77b4',
  '#d62728',
  '#2ca02c',
  '#ff7f0e',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

/**
 * Colours for a population's cells: a palette, and each cell's entry in it by
 * node id. The 3D view's colour-by hands its mapping over in this shape.
 */
export type CellColors = { palette: readonly string[]; columnByNode: Uint16Array };

/**
 * Rows for a population's cells, in another order than their node ids: each
 * cell's row by node id, and how the y axis then reads.
 */
export type RowOrder = { rows: Float32Array; axis: RowAxis };

/**
 * What the plot is zoomed to, where it is: a span of time and a span of rows
 * (inclusive). Each is null while that axis shows all of it.
 */
export type RasterWindow = { time: [number, number] | null; rows: [number, number] | null };

/**
 * Where the visible span of time sits across the plot, in pixels from the
 * container's left edge: `from` at `left`, `to` at `right`, of `width`.
 * A scrubber laid out to match lines up with the raster above it.
 */
export type TimeAxis = { from: number; to: number; left: number; right: number; width: number };

/** The config's markers under the pointer, and where it is on screen. */
export type EventsHover = { group: MarkerGroup; clientX: number; clientY: number };

const NO_EVENTS: readonly TimelineEvent[] = [];

/** How near a spike a click has to land to pick its cell. */
const CLICK_RADIUS_PX = 12;
/** How tall rows have to be, zoomed in, before a click between spikes picks the row's cell. */
const MIN_ROW_PX = 6;

/** The pointed-out cell's spikes and the band along its row. */
const HIGHLIGHT_COLOR = '#0050b3';
const HIGHLIGHT_BAND = 'rgba(0, 80, 179, 0.12)';

/**
 * A population plus whether it is on show. The arrays are the parser's own —
 * already time-sorted (see `sortSpikes` in `spike-trace.ts`), which is what
 * lets the hover lookup binary-search them without keeping a copy.
 */
type PlottedPopulation = {
  name: string;
  timestamps: Float32Array;
  nodeIds: Float64Array;
  visible: boolean;
};

export class RasterRenderer {
  private glCanvas: HTMLCanvasElement;
  private axisCanvas: HTMLCanvasElement;
  private highlightCanvas: HTMLCanvasElement;
  private highlightCtx: CanvasRenderingContext2D | null;
  private interactionLayer: HTMLDivElement;
  private playheadEl: HTMLDivElement;
  private tooltipEl: HTMLDivElement;

  private webgl: WebGLPoints;
  private axis: AxisOverlay;
  private interaction: InteractionManager;
  private observer: ResizeObserver;

  private view: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private initialView: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private plotRect: PlotRect = { x: 0, y: 0, width: 1, height: 1 };
  private pops: PlottedPopulation[] = [];
  private dataBounds: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private visibleSpikes = 0;
  private baseSize = 6;
  private dirty = true;
  private rafId: number | null = null;
  private hasData = false;
  private playhead: number | null = null;
  private cellColors: { name: string; colors: CellColors } | null = null;
  private rowOrder: { name: string; order: RowOrder; cellAtRow: Uint32Array } | null = null;
  private highlight: { name: string; cell: number } | null = null;
  private cellClickHandler: ((cell: number | null) => void) | null = null;
  private windowHandler: ((window: RasterWindow | null) => void) | null = null;
  private timeAxisHandler: ((axis: TimeAxis) => void) | null = null;
  private lastTimeAxis = '';
  private playheadLabel: HTMLSpanElement;
  private events: readonly TimelineEvent[] = [];
  /** The timings under the pointer, whose windows show, and where the names were drawn. */
  private hoveredEvents: readonly TimelineEvent[] = [];
  private markerGroups: MarkerGroup[] = [];
  private eventsHoverHandler: ((hover: EventsHover | null) => void) | null = null;

  constructor(container: HTMLElement) {
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Axis overlay (full size, behind WebGL)
    this.axisCanvas = document.createElement('canvas');
    this.axisCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    container.appendChild(this.axisCanvas);

    // WebGL canvas (positioned within margins for the plot area)
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.style.cssText = 'position:absolute';
    container.appendChild(this.glCanvas);

    // A cell pointed out from elsewhere, over the spikes and redrawn alone, so
    // a pointer running down a table repaints one row rather than every spike.
    this.highlightCanvas = document.createElement('canvas');
    this.highlightCanvas.style.cssText = 'position:absolute;pointer-events:none';
    container.appendChild(this.highlightCanvas);
    this.highlightCtx = this.highlightCanvas.getContext('2d');

    // Playhead rule, above the plot: drawn with the axes it would sit behind
    // the WebGL canvas, and a dense population buries it.
    this.playheadEl = document.createElement('div');
    this.playheadEl.style.cssText =
      'position:absolute;pointer-events:none;display:none;width:1.5px;background:#f5222d';
    container.appendChild(this.playheadEl);
    // Its time, at its foot: the scrubber below is laid out against the axis,
    // with no room for it, and the config's markers hold the top.
    this.playheadLabel = document.createElement('span');
    this.playheadLabel.style.cssText =
      'position:absolute;bottom:6px;padding:0 4px;border-radius:4px;white-space:nowrap;' +
      'background:rgba(255,255,255,0.9);color:#f5222d;font:600 10px/14px -apple-system,BlinkMacSystemFont,sans-serif';
    this.playheadEl.appendChild(this.playheadLabel);

    // Interaction layer (full size, topmost)
    this.interactionLayer = document.createElement('div');
    this.interactionLayer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    container.appendChild(this.interactionLayer);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.style.cssText =
      'position:absolute;pointer-events:none;display:none;' +
      'background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;' +
      'font:11px -apple-system,BlinkMacSystemFont,sans-serif;white-space:pre;z-index:10';
    container.appendChild(this.tooltipEl);

    this.webgl = new WebGLPoints(this.glCanvas);
    this.webgl.onRestored = () => {
      for (const pop of this.pops) {
        this.webgl.setVisibility(pop.name, pop.visible);
      }
      this.webgl.resize(this.glCanvas.width, this.glCanvas.height);
      this.scheduleRender();
    };
    this.axis = new AxisOverlay(this.axisCanvas);
    this.interaction = new InteractionManager(this.interactionLayer);

    this.interaction.onViewChange = (bounds) => {
      this.view = bounds;
      this.scheduleRender();
      this.reportWindow();
    };

    this.interaction.onHover = (info) => this.handleHover(info);
    this.interaction.onClick = (info) => this.handleClick(info);

    // handleResize runs inside the observer callback on purpose: ResizeObserver
    // fires after layout and before paint, so the callback can resize and
    // redraw the canvases before the compositor reads them.
    this.observer = new ResizeObserver(() => this.handleResize());
    this.observer.observe(container);
    this.handleResize();
  }

  setData(populations: SpikePopulation[], dataBounds: ViewBounds) {
    // The same span again - the same spikes cut to fewer cells, say - keeps the
    // zoom, which may be what cut them.
    const sameSpan = this.hasData && sameBounds(this.dataBounds, dataBounds);
    this.dataBounds = dataBounds;
    if (!sameSpan) {
      this.initialView = paddedView(dataBounds);
      this.view = { ...this.initialView };
      this.interaction.setInitialView(this.initialView);
      this.reportWindow();
    }

    this.webgl.setData(populations, POPULATION_COLORS);

    this.pops = populations.map((pop) => ({
      name: pop.name,
      timestamps: pop.timestamps,
      nodeIds: pop.nodeIds,
      visible: true,
    }));

    this.visibleSpikes = populations.reduce((sum, p) => sum + p.timestamps.length, 0);
    this.hasData = true;
    this.applyCellColors();
    this.applyRowOrder();
    this.scheduleRender();
  }

  /**
   * Put one population's cells on rows in another order, kept across new
   * data; null goes back to node ids. The spikes keep their times.
   */
  setRowOrder(name: string, order: RowOrder | null) {
    if (order) {
      const cellAtRow = new Uint32Array(order.rows.length);
      order.rows.forEach((row, cell) => {
        cellAtRow[row] = cell;
      });
      this.rowOrder = { name, order, cellAtRow };
    } else {
      this.rowOrder = null;
    }
    this.applyRowOrder();
    this.scheduleRender();
  }

  /**
   * Told the node id of a cell clicked in the plot: the one whose spike is
   * under the pointer, or, zoomed in until rows are tall enough to aim at,
   * the one whose row is. A click on nothing - between spikes, or beside the
   * plot - is told as null.
   */
  set onCellClick(handler: ((cell: number | null) => void) | null) {
    this.cellClickHandler = handler;
  }

  private handleClick(info: HoverInfo) {
    // A marker of the config's timings zooms the time axis to its blocks' window.
    const marked = this.hasData ? this.markerGroupAt(info, false) : undefined;
    if (marked) {
      this.zoomToWindowOf(marked);
      return;
    }
    const handler = this.cellClickHandler;
    const pop = this.pops.find((p) => p.visible);
    if (!handler || !pop || !this.hasData) return;
    const { view, plotRect } = this;
    const inPlot =
      info.pixelX >= plotRect.x &&
      info.pixelX <= plotRect.x + plotRect.width &&
      info.pixelY >= plotRect.y &&
      info.pixelY <= plotRect.y + plotRect.height;
    if (!inPlot) {
      handler(null);
      return;
    }
    const nearest = this.findNearestPoint(info.dataX, info.dataY);
    if (nearest) {
      const px =
        plotRect.x + ((nearest.time - view.xMin) / (view.xMax - view.xMin)) * plotRect.width;
      const py =
        plotRect.y + (1 - (nearest.row - view.yMin) / (view.yMax - view.yMin)) * plotRect.height;
      if (Math.hypot(info.pixelX - px, info.pixelY - py) <= CLICK_RADIUS_PX) {
        handler(nearest.nodeId);
        return;
      }
    }
    const row = Math.round(info.dataY);
    const order = this.rowOrder?.name === pop.name ? this.rowOrder : null;
    const count = order ? order.cellAtRow.length : this.dataBounds.yMax + 1;
    const aimable = plotRect.height / (view.yMax - view.yMin) >= MIN_ROW_PX;
    if (!aimable || row < 0 || row >= count) {
      handler(null);
      return;
    }
    handler(order ? order.cellAtRow[row] : row);
  }

  /**
   * Told the group of the config's markers under the pointer, and where the
   * pointer is on screen, for a card of its blocks; null once it leaves them.
   */
  set onEventsHover(handler: ((hover: EventsHover | null) => void) | null) {
    this.eventsHoverHandler = handler;
  }

  /** The simulation config's timings, drawn behind the spikes and named on hover. */
  setEvents(events: readonly TimelineEvent[]) {
    this.events = events;
    this.scheduleRender();
  }

  /** Point out one cell of a population, by node id, or none. */
  setHighlightedCell(name: string, cell: number | null) {
    this.highlight = cell === null ? null : { name, cell };
    this.drawHighlight();
  }

  private rowsOf(name: string): Float32Array | null {
    return this.rowOrder?.name === name ? this.rowOrder.order.rows : null;
  }

  private applyRowOrder() {
    for (const pop of this.pops) {
      const rows = this.rowsOf(pop.name);
      this.webgl.setSpikeRows(pop.name, rows && spikeRows(pop.nodeIds, rows));
    }
  }

  /**
   * Draw one population's spikes in their cells' colours, kept across new
   * data; null goes back to the population's own colour. The view is left as
   * it is: only the colour buffer is rewritten.
   */
  setCellColors(name: string, colors: CellColors | null) {
    this.cellColors = colors ? { name, colors } : null;
    this.applyCellColors();
    this.scheduleRender();
  }

  private applyCellColors() {
    this.pops.forEach((pop, index) => {
      const colors = this.cellColors?.name === pop.name ? this.cellColors.colors : null;
      const own = POPULATION_COLORS[index % POPULATION_COLORS.length];
      this.webgl.setSpikeColors(pop.name, colors && spikeColors(pop.nodeIds, colors, own));
    });
  }

  /**
   * Rescale the y-axis, keeping the x-axis and the uploaded spikes.
   *
   * Node ids are per-population row indices, not a shared scale, so when one
   * population is on show the axis should span its ids — against the
   * file-wide range, a small population beside a large one flattens into a
   * sliver along the bottom. Resets the viewport the way new data does: a new
   * scale makes the old zoom meaningless. Unchanged bounds return early, so a
   * cell count landing after the first frame keeps whatever zoom the user set.
   */
  setYBounds(yMin: number, yMax: number) {
    if (!this.hasData) return;
    if (this.dataBounds.yMin === yMin && this.dataBounds.yMax === yMax) return;

    this.dataBounds = { ...this.dataBounds, yMin, yMax };
    this.initialView = paddedView(this.dataBounds);
    this.view = { ...this.initialView };
    this.interaction.setInitialView(this.initialView);
    this.scheduleRender();
    this.reportWindow();
  }

  /** Told what the plot is zoomed to whenever that changes; null when it shows everything. */
  set onWindowChange(handler: ((window: RasterWindow | null) => void) | null) {
    this.windowHandler = handler;
  }

  /** Back to everything, as a double-click does. */
  resetView() {
    this.interaction.resetView('both');
  }

  /** Zoom the time axis to a span, keeping the rows; the whole run zooms back out. */
  setTimeWindow(from: number, to: number) {
    const all = from <= this.dataBounds.xMin && to >= this.dataBounds.xMax;
    this.interaction.setView({
      ...this.view,
      xMin: all ? this.initialView.xMin : from,
      xMax: all ? this.initialView.xMax : to,
    });
  }

  /** Told where the time axis's visible span sits across the plot, whenever that moves. */
  set onTimeAxisChange(handler: ((axis: TimeAxis) => void) | null) {
    this.timeAxisHandler = handler;
    this.lastTimeAxis = '';
    this.reportTimeAxis();
  }

  private reportTimeAxis() {
    const handler = this.timeAxisHandler;
    const width = this.glCanvas.parentElement?.clientWidth ?? 0;
    if (!handler || !this.hasData || width === 0) return;
    const { view, plotRect, dataBounds } = this;
    const from = Math.max(view.xMin, dataBounds.xMin);
    const to = Math.min(view.xMax, dataBounds.xMax);
    const at = (t: number) =>
      plotRect.x + ((t - view.xMin) / (view.xMax - view.xMin)) * plotRect.width;
    const axis = { from, to, left: at(from), right: at(to), width };
    const key = `${axis.from}|${axis.to}|${axis.left.toFixed(2)}|${axis.right.toFixed(2)}|${width}`;
    if (key === this.lastTimeAxis) return;
    this.lastTimeAxis = key;
    handler(axis);
  }

  private reportWindow() {
    const { view, initialView, dataBounds } = this;
    const near = (a: number, b: number, span: number) => Math.abs(a - b) <= span * 1e-6;
    const xSpan = initialView.xMax - initialView.xMin;
    const ySpan = initialView.yMax - initialView.yMin;
    const allTime =
      near(view.xMin, initialView.xMin, xSpan) && near(view.xMax, initialView.xMax, xSpan);
    const allRows =
      near(view.yMin, initialView.yMin, ySpan) && near(view.yMax, initialView.yMax, ySpan);
    this.windowHandler?.(
      allTime && allRows
        ? null
        : {
            time: allTime
              ? null
              : [Math.max(dataBounds.xMin, view.xMin), Math.min(dataBounds.xMax, view.xMax)],
            rows: allRows ? null : [view.yMin, view.yMax],
          }
    );
  }

  /**
   * Mark where the 3D replay currently is, or `null` to clear the rule.
   *
   * Imperative because the replay reports its clock on every painted frame:
   * routing that through React to move one line would re-render the tree at
   * 60 Hz.
   */
  setPlayhead(timeInMs: number | null) {
    if (this.playhead === timeInMs) return;

    this.playhead = timeInMs;
    // Its own layer, so moving it is one style write. Going through the render
    // loop would redraw every spike and repaint the axes sixty times a second
    // for a rule that is on neither.
    this.positionPlayhead();
  }

  setBaseSize(size: number) {
    this.baseSize = size;
    this.scheduleRender();
  }

  setVisiblePopulations(names: Set<string>) {
    for (const pop of this.pops) {
      const visible = names.has(pop.name);
      pop.visible = visible;
      this.webgl.setVisibility(pop.name, visible);
    }
    this.visibleSpikes = this.pops
      .filter((p) => p.visible)
      .reduce((sum, p) => sum + p.timestamps.length, 0);
    this.scheduleRender();
  }

  private scheduleRender() {
    this.dirty = true;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (this.dirty) this.render();
      });
    }
  }

  private render() {
    this.dirty = false;
    if (!this.hasData) return;

    const pointSize = this.computePointSize();
    this.webgl.draw(this.view, pointSize);
    const visible = this.pops.find((p) => p.visible);
    const rows =
      visible && this.rowOrder?.name === visible.name ? this.rowOrder.order.axis : undefined;
    this.axis.draw(this.view, this.plotRect, rows, this.events);
    this.positionPlayhead();
    this.drawHighlight();
    this.reportTimeAxis();
  }

  /**
   * The layer over the spikes: the config's timings, then the pointed-out
   * cell - a band along its row, and its spikes over the rest.
   */
  private drawHighlight() {
    const ctx = this.highlightCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.highlightCanvas.width, this.highlightCanvas.height);
    const highlight = this.highlight;
    const { view, plotRect } = this;
    if (this.hasData && this.events.length > 0) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      this.markerGroups = drawEventMarks(
        ctx,
        view,
        plotRect.width,
        plotRect.height,
        this.events,
        this.hoveredEvents
      );
      ctx.restore();
    }
    const pop = highlight && this.pops.find((p) => p.name === highlight.name && p.visible);
    if (!highlight || !pop || !this.hasData) return;

    const rows = this.rowsOf(pop.name);
    const row = rows ? (rows[highlight.cell] ?? highlight.cell) : highlight.cell;
    const yRange = view.yMax - view.yMin;
    const xRange = view.xMax - view.xMin;
    const py = (1 - (row - view.yMin) / yRange) * plotRect.height;
    if (py < -8 || py > plotRect.height + 8) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    const band = Math.max(5, plotRect.height / yRange);
    ctx.fillStyle = HIGHLIGHT_BAND;
    ctx.fillRect(0, py - band / 2, plotRect.width, band);

    const radius = Math.max(2.5, this.computePointSize() / 2 + 1);
    ctx.fillStyle = HIGHLIGHT_COLOR;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < pop.nodeIds.length; i++) {
      if (pop.nodeIds[i] !== highlight.cell) continue;
      const t = pop.timestamps[i];
      if (t < view.xMin || t > view.xMax) continue;
      ctx.beginPath();
      ctx.arc(((t - view.xMin) / xRange) * plotRect.width, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Its id at the start of the row, on white so the spikes under it do not muddle it.
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    const label = `${highlight.cell}`;
    const width = ctx.measureText(label).width + 10;
    const y = Math.min(plotRect.height - 9, Math.max(9, py));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(4, y - 8, width, 16, 8);
    ctx.fill();
    ctx.fillStyle = HIGHLIGHT_COLOR;
    ctx.fillText(label, 9, y + 0.5);
    ctx.restore();
  }

  /** Where the 3D replay currently is, so the two views read as one moment. */
  private positionPlayhead() {
    const { hasData, playhead, plotRect, view } = this;

    if (!hasData || playhead === null || playhead < view.xMin || playhead > view.xMax) {
      this.playheadEl.style.display = 'none';
      return;
    }

    const px = plotRect.x + ((playhead - view.xMin) / (view.xMax - view.xMin)) * plotRect.width;
    this.playheadEl.style.display = 'block';
    this.playheadEl.style.left = `${px - 0.75}px`;
    this.playheadEl.style.top = `${plotRect.y}px`;
    this.playheadEl.style.height = `${plotRect.height}px`;
    this.playheadLabel.textContent = `${playhead.toFixed(1)} ms`;
    // Beside the rule, on whichever side has room for it.
    const flip = px > plotRect.x + plotRect.width - 64;
    this.playheadLabel.style.left = flip ? '' : '4px';
    this.playheadLabel.style.right = flip ? '4px' : '';
  }

  private computePointSize(): number {
    const factor = countFactor(this.visibleSpikes);

    // Zoom scaling: grows as user zooms in
    const xZoom =
      (this.initialView.xMax - this.initialView.xMin) / (this.view.xMax - this.view.xMin);
    const yZoom =
      (this.initialView.yMax - this.initialView.yMin) / (this.view.yMax - this.view.yMin);
    const zoomBonus = Math.log2(Math.max(1, Math.min(xZoom, yZoom)));

    // Offset keeps the smallest slider value visible even when `factor` shrinks
    // to 0.5 on dense datasets; without it, baseSize=1 renders sub-pixel dots.
    // Cap scales with user-chosen baseSize so large slider values aren't clipped;
    // it still bounds runaway growth from zoomBonus.
    const cap = Math.max(14, this.baseSize * 3);
    return Math.min(cap, (this.baseSize + 0.5) * factor + zoomBonus);
  }

  private handleHover(info: HoverInfo | null) {
    if (!info) {
      this.tooltipEl.style.display = 'none';
      this.setHoveredEvents(NO_EVENTS);
      this.eventsHoverHandler?.(null);
      return;
    }

    // Along the strips at the top and bottom, the timings read before the spikes.
    const inStrips =
      info.pixelY <= this.plotRect.y + EVENT_TOP_ZONE_PX ||
      info.pixelY >= this.plotRect.y + this.plotRect.height - EVENT_BOTTOM_ZONE_PX;
    if (inStrips && this.showEventsAt(info)) return;

    const nearest = this.findNearestPoint(info.dataX, info.dataY);
    if (!nearest) {
      this.showEventsAt(info);
      return;
    }

    // Check pixel distance threshold
    const pxX =
      this.plotRect.x +
      ((nearest.time - this.view.xMin) / (this.view.xMax - this.view.xMin)) * this.plotRect.width;
    const pxY =
      this.plotRect.y +
      (1 - (nearest.row - this.view.yMin) / (this.view.yMax - this.view.yMin)) *
        this.plotRect.height;
    const dist = Math.hypot(info.pixelX - pxX, info.pixelY - pxY);

    if (dist > 20) {
      this.showEventsAt(info);
      return;
    }

    this.tooltipEl.style.display = 'block';
    this.tooltipEl.textContent = `${nearest.population}_${Math.round(nearest.nodeId)}: ${nearest.time.toFixed(2)} ms`;
    this.placeTooltip(info);
    this.setHoveredEvents(NO_EVENTS);
    this.eventsHoverHandler?.(null);
  }

  private setHoveredEvents(events: readonly TimelineEvent[]) {
    const same =
      events.length === this.hoveredEvents.length &&
      events.every((e, i) => e === this.hoveredEvents[i]);
    if (same) return;
    this.hoveredEvents = events;
    this.drawHighlight();
  }

  /**
   * The group of markers under the pointer: an onset's or offset's along the
   * top by its marker or name, a recording's along the bottom by its marker, a
   * synaptic change's anywhere along its rule. Its blocks' windows show, and
   * the host is told, to lay its card out.
   */
  private showEventsAt(info: HoverInfo): boolean {
    const group = this.markerGroupAt(info, true);
    this.tooltipEl.style.display = 'none';
    this.setHoveredEvents(group?.events ?? NO_EVENTS);
    const box = this.glCanvas.parentElement?.getBoundingClientRect();
    this.eventsHoverHandler?.(
      group && box
        ? { group, clientX: box.left + info.pixelX, clientY: box.top + info.pixelY }
        : null
    );
    return group !== undefined;
  }

  /**
   * The group of markers at a point: by its marker or name along the top or
   * bottom, or - with `alongRules` - anywhere along a synaptic change's rule.
   */
  private markerGroupAt(info: HoverInfo, alongRules: boolean): MarkerGroup | undefined {
    const { plotRect } = this;
    const x = info.pixelX - plotRect.x;
    const inTop = info.pixelY >= plotRect.y && info.pixelY <= plotRect.y + EVENT_TOP_ZONE_PX;
    const inBottom =
      info.pixelY <= plotRect.y + plotRect.height &&
      info.pixelY >= plotRect.y + plotRect.height - EVENT_BOTTOM_ZONE_PX;
    const marked = this.markerGroups.find((g) => {
      if (g.top ? !inTop : !inBottom) return false;
      const named = g.label !== undefined && x >= g.label.x && x <= g.label.x + g.label.width;
      return named || Math.abs(x - g.x) <= EVENT_HIT_PX;
    });
    if (marked || !alongRules) return marked;
    return this.markerGroups.find(
      (g) =>
        g.edge === 'start' &&
        Math.abs(x - g.x) <= 4 &&
        g.events.some((e) => e.kind === 'manipulation')
    );
  }

  /**
   * Zoom the time axis to a group's blocks: from the first onset to the last
   * offset, what holds on to the end of the run, and an instant with a little
   * room either side, since a window needs a width.
   */
  private zoomToWindowOf(group: MarkerGroup) {
    const { xMin, xMax } = this.dataBounds;
    let from = Math.min(...group.events.map((e) => e.start));
    let to = Math.max(...group.events.map((e) => e.end ?? xMax));
    if (to - from < (xMax - xMin) * 0.002) {
      const room = (xMax - xMin) * 0.025;
      from -= room;
      to += room;
    }
    this.setTimeWindow(Math.max(xMin, from), Math.min(xMax, to));
  }

  private placeTooltip(info: HoverInfo) {
    // Edge-aware placement: flip when tooltip would overflow container
    const container = this.glCanvas.parentElement;
    const cw = container?.clientWidth ?? 0;
    const ch = container?.clientHeight ?? 0;
    const tw = this.tooltipEl.offsetWidth;
    const th = this.tooltipEl.offsetHeight;
    const gap = 12;

    const flipsLeft = info.pixelX + gap + tw > cw;
    const left = flipsLeft ? info.pixelX - gap - tw : info.pixelX + gap;
    const flipsUp = info.pixelY - gap + th > ch;
    const top = flipsUp ? info.pixelY - gap - th : info.pixelY - gap;

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private findNearestPoint(
    dataX: number,
    dataY: number
  ): { population: string; nodeId: number; row: number; time: number } | null {
    const xRange = this.view.xMax - this.view.xMin;
    const yRange = this.view.yMax - this.view.yMin;
    // Search threshold: 20px in data coordinates
    const xThresh = (xRange * 20) / Math.max(1, this.plotRect.width);
    const yThresh = (yRange * 20) / Math.max(1, this.plotRect.height);

    let bestDist = Infinity;
    let bestResult: { population: string; nodeId: number; row: number; time: number } | null = null;

    for (const pop of this.pops) {
      if (!pop.visible || pop.timestamps.length === 0) continue;
      const rows = this.rowsOf(pop.name);

      // Binary search for start of x window
      const lo = lowerBound(pop.timestamps, dataX - xThresh);
      const hi = upperBound(pop.timestamps, dataX + xThresh);

      for (let i = lo; i < hi; i++) {
        const nodeId = pop.nodeIds[i];
        const row = rows ? (rows[nodeId] ?? nodeId) : nodeId;
        const dy = Math.abs(row - dataY);
        if (dy > yThresh) continue;

        // Normalized distance for fair comparison across axes
        const dx = (pop.timestamps[i] - dataX) / xRange;
        const dyNorm = (row - dataY) / yRange;
        const dist = dx * dx + dyNorm * dyNorm;

        if (dist < bestDist) {
          bestDist = dist;
          bestResult = { population: pop.name, nodeId, row, time: pop.timestamps[i] };
        }
      }
    }

    return bestResult;
  }

  private handleResize() {
    const container = this.glCanvas.parentElement;
    if (!container) return;
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Update plot rect
    this.plotRect = {
      x: MARGIN.left,
      y: MARGIN.top,
      width: Math.max(1, w - MARGIN.left - MARGIN.right),
      height: Math.max(1, h - MARGIN.top - MARGIN.bottom),
    };

    // Size and position GL canvas to plot area
    this.glCanvas.style.left = `${this.plotRect.x}px`;
    this.glCanvas.style.top = `${this.plotRect.y}px`;
    this.glCanvas.style.width = `${this.plotRect.width}px`;
    this.glCanvas.style.height = `${this.plotRect.height}px`;
    this.glCanvas.width = this.plotRect.width * dpr;
    this.glCanvas.height = this.plotRect.height * dpr;
    this.webgl.resize(this.glCanvas.width, this.glCanvas.height);
    this.highlightCanvas.style.cssText = `${this.glCanvas.style.cssText};pointer-events:none`;
    this.highlightCanvas.width = this.glCanvas.width;
    this.highlightCanvas.height = this.glCanvas.height;

    // Size axis canvas to full container
    this.axisCanvas.width = w * dpr;
    this.axisCanvas.height = h * dpr;

    this.interaction.setPlotRect(this.plotRect);
    // Setting a canvas's size resets it, so the redraw belongs in this same
    // task. A redraw queued for the next frame would let the browser composite
    // the empty canvases once per resize step, and a divider drag would blink.
    this.render();
  }

  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.observer.disconnect();
    this.interaction.destroy();
    this.webgl.destroy();

    this.glCanvas.remove();
    this.highlightCanvas.remove();
    this.axisCanvas.remove();
    this.interactionLayer.remove();
    this.playheadEl.remove();
    this.tooltipEl.remove();
  }
}

/**
 * Multiplier that shrinks point size as the dataset grows. 1.0 below 1k spikes,
 * 0.5 at/above 100k, smoothly interpolated in log-space between — count spans
 * orders of magnitude, so log-space puts the visible transition where users
 * actually feel it (1k → 10k → 100k) rather than compressed near the cap.
 */
function countFactor(n: number): number {
  const lo = 1_000;
  const hi = 100_000;
  if (n <= lo) return 1.0;
  if (n >= hi) return 0.5;
  const t = Math.log10(n / lo) / Math.log10(hi / lo);
  return 1.0 - 0.5 * t;
}

/** RGBA bytes per spike from its cell's colour; a cell with none keeps `own`. */
function spikeColors(nodeIds: Float64Array, colors: CellColors, own: string): Uint8Array {
  const fallback = rgbOf(own) ?? [0, 0, 0];
  const palette = colors.palette.map((c) => rgbOf(c) ?? fallback);
  const { columnByNode } = colors;
  const bytes = new Uint8Array(nodeIds.length * 4);
  for (let i = 0; i < nodeIds.length; i++) {
    // An id that is no row index reads undefined here, and keeps the fallback.
    const rgb = palette[columnByNode[nodeIds[i]]] ?? fallback;
    bytes[i * 4] = rgb[0];
    bytes[i * 4 + 1] = rgb[1];
    bytes[i * 4 + 2] = rgb[2];
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
}

/** Each spike's row from its cell's; an id past the rows keeps itself. */
function spikeRows(nodeIds: Float64Array, rows: Float32Array): Float32Array {
  const out = new Float32Array(nodeIds.length);
  for (let i = 0; i < nodeIds.length; i++) out[i] = rows[nodeIds[i]] ?? nodeIds[i];
  return out;
}

/** `#rgb`, `#rrggbb` or `rgb(…)` as bytes; null for anything else. */
function rgbOf(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    const n = Number.parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function sameBounds(a: ViewBounds, b: ViewBounds): boolean {
  return a.xMin === b.xMin && a.xMax === b.xMax && a.yMin === b.yMin && a.yMax === b.yMax;
}

/** Data bounds plus the margin that keeps edge spikes off the plot border. */
function paddedView(bounds: ViewBounds): ViewBounds {
  const xPad = (bounds.xMax - bounds.xMin) * 0.02 || 1;
  const yPad = (bounds.yMax - bounds.yMin) * 0.05 || 1;
  return {
    xMin: bounds.xMin - xPad,
    xMax: bounds.xMax + xPad,
    yMin: bounds.yMin - yPad,
    yMax: bounds.yMax + yPad,
  };
}

/** Find first index where arr[i] >= value (lower bound). */
function lowerBound(arr: Float32Array, value: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Find first index where arr[i] > value (upper bound). */
function upperBound(arr: Float32Array, value: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
