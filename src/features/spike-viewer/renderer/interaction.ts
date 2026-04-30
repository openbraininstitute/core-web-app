import { MARGIN } from '@/features/spike-viewer/renderer/axis-overlay';

import type { PlotRect, ViewBounds } from '@/features/spike-viewer/renderer/axis-overlay';

const MIN_RANGE = 1e-6;
const MIN_DRAG_PX = 5;

export type HoverInfo = {
  dataX: number;
  dataY: number;
  pixelX: number;
  pixelY: number;
};

type DragMode = 'pan' | 'zoom-x' | 'zoom-y' | 'zoom-xy';

type DragState = {
  mode: DragMode;
  startClient: { x: number; y: number };
  lastClient: { x: number; y: number };
  pointerId: number;
};

export class InteractionManager {
  private view: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private initialView: ViewBounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  private plotRect: PlotRect = { x: 0, y: 0, width: 1, height: 1 };
  private element: HTMLElement;
  private selectionMask: HTMLDivElement;
  private selectionEl: HTMLDivElement;

  private drag: DragState | null = null;

  onViewChange: ((bounds: ViewBounds) => void) | null = null;
  onHover: ((info: HoverInfo | null) => void) | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointercancel', this.handlePointerUp);
    element.addEventListener('pointerleave', this.handlePointerLeave);
    element.addEventListener('dblclick', this.handleDblClick);
    element.style.cursor = 'crosshair';
    element.style.touchAction = 'none';

    // Wrapping mask clips the selection's huge box-shadow to the plot area,
    // so the dim overlay covers only the chart and not the axis labels.
    this.selectionMask = document.createElement('div');
    Object.assign(this.selectionMask.style, {
      position: 'absolute',
      pointerEvents: 'none',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 300ms ease-out',
    } satisfies Partial<CSSStyleDeclaration>);

    this.selectionEl = document.createElement('div');
    Object.assign(this.selectionEl.style, {
      position: 'absolute',
      pointerEvents: 'none',
      border: '1px solid #eee',
      boxSizing: 'border-box',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
    } satisfies Partial<CSSStyleDeclaration>);

    this.selectionMask.appendChild(this.selectionEl);
    element.appendChild(this.selectionMask);
  }

  setInitialView(bounds: ViewBounds) {
    this.initialView = { ...bounds };
    this.view = { ...bounds };
  }

  setPlotRect(rect: PlotRect) {
    this.plotRect = rect;
  }

  resetView(axis: 'x' | 'y' | 'both' = 'both') {
    if (axis === 'x' || axis === 'both') {
      this.view.xMin = this.initialView.xMin;
      this.view.xMax = this.initialView.xMax;
    }
    if (axis === 'y' || axis === 'both') {
      this.view.yMin = this.initialView.yMin;
      this.view.yMax = this.initialView.yMax;
    }
    this.onViewChange?.(this.view);
  }

  private elementPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private isInPlotArea(clientX: number, clientY: number): boolean {
    const { x: px, y: py } = this.elementPoint(clientX, clientY);
    const { x, y, width, height } = this.plotRect;
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  private isInXAxisArea(clientX: number, clientY: number): boolean {
    const { x: px, y: py } = this.elementPoint(clientX, clientY);
    const { x, y, width, height } = this.plotRect;
    return px >= x && px <= x + width && py > y + height && py <= y + height + MARGIN.bottom;
  }

  private isInYAxisArea(clientX: number, clientY: number): boolean {
    const { x: px, y: py } = this.elementPoint(clientX, clientY);
    const { x, y, width: _w, height } = this.plotRect;
    return px >= x - MARGIN.left && px < x && py >= y && py <= y + height;
  }

  private pixelToData(clientX: number, clientY: number): { x: number; y: number } {
    const { x: px, y: py } = this.elementPoint(clientX, clientY);
    const { x, y, width, height } = this.plotRect;
    const normX = (px - x) / width;
    const normY = 1 - (py - y) / height;
    return {
      x: this.view.xMin + normX * (this.view.xMax - this.view.xMin),
      y: this.view.yMin + normY * (this.view.yMax - this.view.yMin),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private updateSelectionRect() {
    if (!this.drag || this.drag.mode === 'pan') {
      this.selectionMask.style.opacity = '0';
      return;
    }

    const start = this.elementPoint(this.drag.startClient.x, this.drag.startClient.y);
    const cur = this.elementPoint(this.drag.lastClient.x, this.drag.lastClient.y);
    const { x, y, width, height } = this.plotRect;

    let left: number;
    let top: number;
    let w: number;
    let h: number;

    if (this.drag.mode === 'zoom-x') {
      const x1 = this.clamp(start.x, x, x + width);
      const x2 = this.clamp(cur.x, x, x + width);
      left = Math.min(x1, x2);
      w = Math.abs(x2 - x1);
      top = y;
      h = height;
    } else if (this.drag.mode === 'zoom-y') {
      const y1 = this.clamp(start.y, y, y + height);
      const y2 = this.clamp(cur.y, y, y + height);
      top = Math.min(y1, y2);
      h = Math.abs(y2 - y1);
      left = x;
      w = width;
    } else {
      const x1 = this.clamp(start.x, x, x + width);
      const x2 = this.clamp(cur.x, x, x + width);
      const y1 = this.clamp(start.y, y, y + height);
      const y2 = this.clamp(cur.y, y, y + height);
      left = Math.min(x1, x2);
      top = Math.min(y1, y2);
      w = Math.abs(x2 - x1);
      h = Math.abs(y2 - y1);
    }

    this.selectionMask.style.left = `${x}px`;
    this.selectionMask.style.top = `${y}px`;
    this.selectionMask.style.width = `${width}px`;
    this.selectionMask.style.height = `${height}px`;
    this.selectionMask.style.opacity = '1';

    this.selectionEl.style.left = `${left - x}px`;
    this.selectionEl.style.top = `${top - y}px`;
    this.selectionEl.style.width = `${w}px`;
    this.selectionEl.style.height = `${h}px`;
  }

  private cursorForRegion(clientX: number, clientY: number, shiftKey: boolean): string {
    if (this.isInPlotArea(clientX, clientY)) return shiftKey ? 'grab' : 'crosshair';
    if (this.isInXAxisArea(clientX, clientY)) return 'col-resize';
    if (this.isInYAxisArea(clientX, clientY)) return 'row-resize';
    return 'default';
  }

  private readonly handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    let mode: DragMode | null = null;
    if (this.isInPlotArea(e.clientX, e.clientY)) {
      mode = e.shiftKey ? 'pan' : 'zoom-xy';
    } else if (this.isInXAxisArea(e.clientX, e.clientY)) {
      mode = 'zoom-x';
    } else if (this.isInYAxisArea(e.clientX, e.clientY)) {
      mode = 'zoom-y';
    }
    if (!mode) return;

    e.preventDefault();
    this.drag = {
      mode,
      startClient: { x: e.clientX, y: e.clientY },
      lastClient: { x: e.clientX, y: e.clientY },
      pointerId: e.pointerId,
    };
    this.onHover?.(null);
    this.element.setPointerCapture(e.pointerId);
    this.element.style.cursor = mode === 'pan' ? 'grabbing' : 'crosshair';
  };

  private readonly handlePointerMove = (e: PointerEvent) => {
    if (this.drag) {
      const dx = e.clientX - this.drag.lastClient.x;
      const dy = e.clientY - this.drag.lastClient.y;
      this.drag.lastClient = { x: e.clientX, y: e.clientY };

      if (this.drag.mode === 'pan') {
        const xRange = this.view.xMax - this.view.xMin;
        const yRange = this.view.yMax - this.view.yMin;
        const dataX = -(dx / this.plotRect.width) * xRange;
        const dataY = (dy / this.plotRect.height) * yRange;

        this.view = {
          xMin: this.view.xMin + dataX,
          xMax: this.view.xMax + dataX,
          yMin: this.view.yMin + dataY,
          yMax: this.view.yMax + dataY,
        };
        this.clampView();
        this.onViewChange?.(this.view);
      } else {
        this.updateSelectionRect();
      }
      return;
    }

    this.element.style.cursor = this.cursorForRegion(e.clientX, e.clientY, e.shiftKey);

    if (this.isInPlotArea(e.clientX, e.clientY)) {
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
    if (!this.drag || this.drag.pointerId !== e.pointerId) return;

    const drag = this.drag;
    this.drag = null;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
    this.element.style.cursor = this.cursorForRegion(e.clientX, e.clientY, e.shiftKey);

    if (drag.mode === 'pan') return;

    this.selectionMask.style.opacity = '0';

    const dx = Math.abs(drag.lastClient.x - drag.startClient.x);
    const dy = Math.abs(drag.lastClient.y - drag.startClient.y);
    const significant =
      drag.mode === 'zoom-x'
        ? dx >= MIN_DRAG_PX
        : drag.mode === 'zoom-y'
          ? dy >= MIN_DRAG_PX
          : dx >= MIN_DRAG_PX || dy >= MIN_DRAG_PX;
    if (!significant) return;

    const d1 = this.pixelToData(drag.startClient.x, drag.startClient.y);
    const d2 = this.pixelToData(drag.lastClient.x, drag.lastClient.y);
    const next: ViewBounds = { ...this.view };

    if (drag.mode === 'zoom-x' || drag.mode === 'zoom-xy') {
      const xMin = Math.min(d1.x, d2.x);
      const xMax = Math.max(d1.x, d2.x);
      if (xMax - xMin >= MIN_RANGE) {
        next.xMin = xMin;
        next.xMax = xMax;
      }
    }
    if (drag.mode === 'zoom-y' || drag.mode === 'zoom-xy') {
      const yMin = Math.min(d1.y, d2.y);
      const yMax = Math.max(d1.y, d2.y);
      if (yMax - yMin >= MIN_RANGE) {
        next.yMin = yMin;
        next.yMax = yMax;
      }
    }

    this.view = next;
    this.clampView();
    this.onViewChange?.(this.view);
  };

  private readonly handlePointerLeave = () => {
    if (!this.drag) this.onHover?.(null);
  };

  private readonly handleDblClick = (e: MouseEvent) => {
    if (this.isInPlotArea(e.clientX, e.clientY)) {
      this.resetView('both');
    } else if (this.isInXAxisArea(e.clientX, e.clientY)) {
      this.resetView('x');
    } else if (this.isInYAxisArea(e.clientX, e.clientY)) {
      this.resetView('y');
    }
  };

  private clampView() {
    const iv = this.initialView;

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
    el.removeEventListener('pointerdown', this.handlePointerDown);
    el.removeEventListener('pointermove', this.handlePointerMove);
    el.removeEventListener('pointerup', this.handlePointerUp);
    el.removeEventListener('pointercancel', this.handlePointerUp);
    el.removeEventListener('pointerleave', this.handlePointerLeave);
    el.removeEventListener('dblclick', this.handleDblClick);
    if (this.selectionMask.parentElement === el) {
      el.removeChild(this.selectionMask);
    }
  }
}
