import type { PlotRect, ViewBounds } from '@/features/spike-viewer/renderer/axis-overlay';

const ZOOM_FACTOR = 0.1;
const MIN_RANGE = 1e-6;

export type HoverInfo = {
  dataX: number;
  dataY: number;
  pixelX: number;
  pixelY: number;
};

export class InteractionManager {
  private view: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private initialView: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private plotRect: PlotRect = { x: 0, y: 0, width: 1, height: 1 };
  private element: HTMLElement;

  private isDragging = false;
  private lastMouse: { x: number; y: number } | null = null;

  onViewChange: ((bounds: ViewBounds) => void) | null = null;
  onHover: ((info: HoverInfo | null) => void) | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('wheel', this.handleWheel, { passive: false });
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointerleave', this.handlePointerLeave);
    element.addEventListener('dblclick', this.handleDblClick);
    element.style.cursor = 'crosshair';
    element.style.touchAction = 'none';
  }

  setView(bounds: ViewBounds) {
    this.view = { ...bounds };
  }

  setInitialView(bounds: ViewBounds) {
    this.initialView = { ...bounds };
    this.view = { ...bounds };
  }

  setPlotRect(rect: PlotRect) {
    this.plotRect = rect;
  }

  resetView() {
    this.view = { ...this.initialView };
    this.onViewChange?.(this.view);
  }

  private isInPlotArea(clientX: number, clientY: number): boolean {
    const rect = this.element.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x, y, width, height } = this.plotRect;
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  private pixelToData(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x, y, width, height } = this.plotRect;
    const normX = (px - x) / width;
    const normY = 1 - (py - y) / height; // Flip Y: pixel Y goes down, data Y goes up
    return {
      x: this.view.xMin + normX * (this.view.xMax - this.view.xMin),
      y: this.view.yMin + normY * (this.view.yMax - this.view.yMin),
    };
  }

  private readonly handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.isInPlotArea(e.clientX, e.clientY)) return;

    const direction = e.deltaY > 0 ? 1 : -1;
    const factor = 1 + ZOOM_FACTOR * direction;
    const cursor = this.pixelToData(e.clientX, e.clientY);

    const xRange = this.view.xMax - this.view.xMin;
    const yRange = this.view.yMax - this.view.yMin;

    // Zoom centered on cursor position
    const xRatio = (cursor.x - this.view.xMin) / xRange;
    const yRatio = (cursor.y - this.view.yMin) / yRange;

    const newXRange = Math.max(MIN_RANGE, xRange * factor);
    const newYRange = Math.max(MIN_RANGE, yRange * factor);

    this.view = {
      xMin: cursor.x - xRatio * newXRange,
      xMax: cursor.x + (1 - xRatio) * newXRange,
      yMin: cursor.y - yRatio * newYRange,
      yMax: cursor.y + (1 - yRatio) * newYRange,
    };

    this.clampView();
    this.onViewChange?.(this.view);
  };

  private readonly handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (!this.isInPlotArea(e.clientX, e.clientY)) return;

    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.element.setPointerCapture(e.pointerId);
    this.element.style.cursor = 'grabbing';
  };

  private readonly handlePointerMove = (e: PointerEvent) => {
    if (this.isDragging && this.lastMouse) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };

      const xRange = this.view.xMax - this.view.xMin;
      const yRange = this.view.yMax - this.view.yMin;
      const dataX = -(dx / this.plotRect.width) * xRange;
      const dataY = (dy / this.plotRect.height) * yRange; // Flip Y

      this.view = {
        xMin: this.view.xMin + dataX,
        xMax: this.view.xMax + dataX,
        yMin: this.view.yMin + dataY,
        yMax: this.view.yMax + dataY,
      };

      this.clampView();
      this.onViewChange?.(this.view);
    } else if (this.isInPlotArea(e.clientX, e.clientY)) {
      const rect = this.element.getBoundingClientRect();
      const data = this.pixelToData(e.clientX, e.clientY);
      this.onHover?.({
        dataX: data.x,
        dataY: data.y,
        pixelX: e.clientX - rect.left,
        pixelY: e.clientY - rect.top,
      });
    } else {
      this.onHover?.(null);
    }
  };

  private readonly handlePointerUp = (e: PointerEvent) => {
    if (this.isDragging) {
      this.isDragging = false;
      this.lastMouse = null;
      this.element.releasePointerCapture(e.pointerId);
      this.element.style.cursor = 'crosshair';
    }
  };

  private readonly handlePointerLeave = () => {
    this.onHover?.(null);
  };

  private readonly handleDblClick = (e: MouseEvent) => {
    if (this.isInPlotArea(e.clientX, e.clientY)) {
      this.resetView();
    }
  };

  private clampView() {
    const iv = this.initialView;

    // X axis
    const xRange = this.view.xMax - this.view.xMin;
    const xDataRange = iv.xMax - iv.xMin;
    if (xRange >= xDataRange) {
      this.view.xMin = iv.xMin;
      this.view.xMax = iv.xMax;
    } else {
      if (this.view.xMin < iv.xMin) {
        this.view.xMax += iv.xMin - this.view.xMin;
        this.view.xMin = iv.xMin;
      }
      if (this.view.xMax > iv.xMax) {
        this.view.xMin -= this.view.xMax - iv.xMax;
        this.view.xMax = iv.xMax;
      }
    }

    // Y axis
    const yRange = this.view.yMax - this.view.yMin;
    const yDataRange = iv.yMax - iv.yMin;
    if (yRange >= yDataRange) {
      this.view.yMin = iv.yMin;
      this.view.yMax = iv.yMax;
    } else {
      if (this.view.yMin < iv.yMin) {
        this.view.yMax += iv.yMin - this.view.yMin;
        this.view.yMin = iv.yMin;
      }
      if (this.view.yMax > iv.yMax) {
        this.view.yMin -= this.view.yMax - iv.yMax;
        this.view.yMax = iv.yMax;
      }
    }
  }

  destroy() {
    const el = this.element;
    el.removeEventListener('wheel', this.handleWheel);
    el.removeEventListener('pointerdown', this.handlePointerDown);
    el.removeEventListener('pointermove', this.handlePointerMove);
    el.removeEventListener('pointerup', this.handlePointerUp);
    el.removeEventListener('pointerleave', this.handlePointerLeave);
    el.removeEventListener('dblclick', this.handleDblClick);
  }
}
