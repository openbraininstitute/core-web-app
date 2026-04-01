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

/** Sorted population data for efficient binary-search hover. */
type SortedPopulation = {
  name: string;
  timestamps: Float32Array;
  nodeIds: Float32Array;
  visible: boolean;
};

export class RasterRenderer {
  private glCanvas: HTMLCanvasElement;
  private axisCanvas: HTMLCanvasElement;
  private interactionLayer: HTMLDivElement;
  private tooltipEl: HTMLDivElement;

  private webgl: WebGLPoints;
  private axis: AxisOverlay;
  private interaction: InteractionManager;
  private observer: ResizeObserver;

  private view: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private initialView: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private plotRect: PlotRect = { x: 0, y: 0, width: 1, height: 1 };
  private sortedPops: SortedPopulation[] = [];
  private totalSpikes = 0;
  private dirty = true;
  private rafId: number | null = null;
  private hasData = false;

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
    this.axis = new AxisOverlay(this.axisCanvas);
    this.interaction = new InteractionManager(this.interactionLayer);

    this.interaction.onViewChange = (bounds) => {
      this.view = bounds;
      this.scheduleRender();
    };

    this.interaction.onHover = (info) => this.handleHover(info);

    this.observer = new ResizeObserver(() => this.handleResize());
    this.observer.observe(container);
    this.handleResize();
  }

  setData(populations: SpikePopulation[], dataBounds: ViewBounds) {
    // Add padding to data bounds
    const xPad = (dataBounds.xMax - dataBounds.xMin) * 0.02 || 1;
    const yPad = (dataBounds.yMax - dataBounds.yMin) * 0.05 || 1;
    this.initialView = {
      xMin: dataBounds.xMin - xPad,
      xMax: dataBounds.xMax + xPad,
      yMin: dataBounds.yMin - yPad,
      yMax: dataBounds.yMax + yPad,
    };
    this.view = { ...this.initialView };

    this.webgl.setData(populations, POPULATION_COLORS);
    this.interaction.setInitialView(this.initialView);

    // Build sorted copies for binary-search hover
    this.sortedPops = populations.map((pop) => {
      const { timestamps, nodeIds } = sortByTimestamp(pop.timestamps, pop.nodeIds);
      return { name: pop.name, timestamps, nodeIds, visible: true };
    });

    this.totalSpikes = populations.reduce((sum, p) => sum + p.timestamps.length, 0);
    this.hasData = true;
    this.scheduleRender();
  }

  setVisiblePopulations(names: Set<string>) {
    for (const pop of this.sortedPops) {
      const visible = names.has(pop.name);
      pop.visible = visible;
      this.webgl.setVisibility(pop.name, visible);
    }
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
  }

  private computePointSize(): number {
    // Density-aware base: large for sparse data, small for dense
    const visibleArea = this.plotRect.width * this.plotRect.height;
    const density = this.totalSpikes / Math.max(1, visibleArea);
    const baseSize = Math.min(6, Math.max(2, 4 - Math.log10(Math.max(1e-4, density))));

    // Zoom scaling: grows as user zooms in
    const xZoom =
      (this.initialView.xMax - this.initialView.xMin) / (this.view.xMax - this.view.xMin);
    const yZoom =
      (this.initialView.yMax - this.initialView.yMin) / (this.view.yMax - this.view.yMin);
    const zoom = Math.min(xZoom, yZoom);
    const zoomBonus = Math.log2(Math.max(1, zoom));

    return Math.min(12, baseSize + zoomBonus);
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
    this.tooltipEl.textContent =
      `${nearest.population}_${Math.round(nearest.nodeId)}: ${nearest.time.toFixed(2)} ms`;

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

    for (const pop of this.sortedPops) {
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
    this.scheduleRender();
  }

  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.observer.disconnect();
    this.interaction.destroy();
    this.webgl.destroy();

    this.glCanvas.remove();
    this.axisCanvas.remove();
    this.interactionLayer.remove();
    this.tooltipEl.remove();
  }
}

/** Sort timestamps and nodeIds arrays together by timestamp (ascending). */
function sortByTimestamp(
  timestamps: Float32Array,
  nodeIds: Float32Array
): { timestamps: Float32Array; nodeIds: Float32Array } {
  const n = timestamps.length;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  indices.sort((a, b) => timestamps[a] - timestamps[b]);

  const sortedTs = new Float32Array(n);
  const sortedIds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    sortedTs[i] = timestamps[indices[i]];
    sortedIds[i] = nodeIds[indices[i]];
  }
  return { timestamps: sortedTs, nodeIds: sortedIds };
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
