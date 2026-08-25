import { AxisOverlay, MARGIN } from '@/features/spike-viewer/renderer/axis-overlay';
import { InteractionManager } from '@/features/spike-viewer/renderer/interaction';
import { WebGLPoints } from '@/features/spike-viewer/renderer/webgl-points';

import type { PlotRect, ViewBounds } from '@/features/spike-viewer/renderer/axis-overlay';
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

    // Playhead rule, above the plot: drawn with the axes it would sit behind
    // the WebGL canvas, and a dense population buries it.
    this.playheadEl = document.createElement('div');
    this.playheadEl.style.cssText =
      'position:absolute;pointer-events:none;display:none;width:1.5px;background:#f5222d';
    container.appendChild(this.playheadEl);

    // Interaction layer (full size, topmost)
    this.interactionLayer = document.createElement('div');
    this.interactionLayer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    container.appendChild(this.interactionLayer);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.style.cssText =
      'position:absolute;pointer-events:none;display:none;' +
      'background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;' +
      'font:11px -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;z-index:10';
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
    };

    this.interaction.onHover = (info) => this.handleHover(info);

    // handleResize runs inside the observer callback on purpose: ResizeObserver
    // fires after layout and before paint, so the callback can resize and
    // redraw the canvases before the compositor reads them.
    this.observer = new ResizeObserver(() => this.handleResize());
    this.observer.observe(container);
    this.handleResize();
  }

  setData(populations: SpikePopulation[], dataBounds: ViewBounds) {
    this.dataBounds = dataBounds;
    this.initialView = paddedView(dataBounds);
    this.view = { ...this.initialView };

    this.webgl.setData(populations, POPULATION_COLORS);
    this.interaction.setInitialView(this.initialView);

    this.pops = populations.map((pop) => ({
      name: pop.name,
      timestamps: pop.timestamps,
      nodeIds: pop.nodeIds,
      visible: true,
    }));

    this.visibleSpikes = populations.reduce((sum, p) => sum + p.timestamps.length, 0);
    this.hasData = true;
    this.scheduleRender();
  }

  /**
   * Rescale the y-axis, keeping the x-axis and the uploaded spikes.
   *
   * Node ids are per-population row indices, not a shared scale, so when one
   * population is on show the axis should span its ids — against the
   * file-wide range, a small population beside a large one flattens into a
   * sliver along the bottom. Resets the viewport the way new data does: a new
   * scale makes the old zoom meaningless.
   */
  setYBounds(yMin: number, yMax: number) {
    if (!this.hasData) return;

    this.dataBounds = { ...this.dataBounds, yMin, yMax };
    this.initialView = paddedView(this.dataBounds);
    this.view = { ...this.initialView };
    this.interaction.setInitialView(this.initialView);
    this.scheduleRender();
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

  /** Called with a time in ms when the user clicks in the plot. */
  set onSeek(handler: ((timeInMs: number) => void) | null) {
    this.interaction.onSeek = handler;
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
    this.axis.draw(this.view, this.plotRect);
    this.positionPlayhead();
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
      return;
    }

    const nearest = this.findNearestPoint(info.dataX, info.dataY);
    if (!nearest) {
      this.tooltipEl.style.display = 'none';
      return;
    }

    // Check pixel distance threshold
    const pxX =
      this.plotRect.x +
      ((nearest.time - this.view.xMin) / (this.view.xMax - this.view.xMin)) * this.plotRect.width;
    const pxY =
      this.plotRect.y +
      (1 - (nearest.nodeId - this.view.yMin) / (this.view.yMax - this.view.yMin)) *
        this.plotRect.height;
    const dist = Math.hypot(info.pixelX - pxX, info.pixelY - pxY);

    if (dist > 20) {
      this.tooltipEl.style.display = 'none';
      return;
    }

    this.tooltipEl.style.display = 'block';
    this.tooltipEl.textContent = `${nearest.population}_${Math.round(nearest.nodeId)}: ${nearest.time.toFixed(2)} ms`;

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
  ): { population: string; nodeId: number; time: number } | null {
    const xRange = this.view.xMax - this.view.xMin;
    const yRange = this.view.yMax - this.view.yMin;
    // Search threshold: 20px in data coordinates
    const xThresh = (xRange * 20) / Math.max(1, this.plotRect.width);
    const yThresh = (yRange * 20) / Math.max(1, this.plotRect.height);

    let bestDist = Infinity;
    let bestResult: { population: string; nodeId: number; time: number } | null = null;

    for (const pop of this.pops) {
      if (!pop.visible || pop.timestamps.length === 0) continue;

      // Binary search for start of x window
      const lo = lowerBound(pop.timestamps, dataX - xThresh);
      const hi = upperBound(pop.timestamps, dataX + xThresh);

      for (let i = lo; i < hi; i++) {
        const dy = Math.abs(pop.nodeIds[i] - dataY);
        if (dy > yThresh) continue;

        // Normalized distance for fair comparison across axes
        const dx = (pop.timestamps[i] - dataX) / xRange;
        const dyNorm = (pop.nodeIds[i] - dataY) / yRange;
        const dist = dx * dx + dyNorm * dyNorm;

        if (dist < bestDist) {
          bestDist = dist;
          bestResult = { population: pop.name, nodeId: pop.nodeIds[i], time: pop.timestamps[i] };
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
