/* eslint-disable no-param-reassign */

import { clamp } from 'es-toolkit/compat';
import React from 'react';

import GenericEvent from '@/util/generic-event';

import { createTreeStructure, type TreeItem } from './tree';

import type { Morphology } from '@/services/bluenaas-single-cell/types';

const MARGIN = 32;

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  item?: TreeItem;
  color: string;
  // This segment has no child
  leave: boolean;
}

class PainterDendrogram {
  public readonly eventHover = new GenericEvent<TreeItem>();

  private hoveredItem: TreeItem | null = null;

  private hoveredSegment: Segment | null = null;

  private grid: TreeItem[][] = [];

  private _mode: 'straight' | 'circular' = 'straight';

  private _morphology: Morphology = {};

  private context: CanvasRenderingContext2D | null = null;

  private readonly observer: ResizeObserver;

  private paintingScheduled = false;

  private segments: Record<string, Segment[]> = {};

  private lineWidth = 1;

  constructor() {
    this.observer = new ResizeObserver(this.paint);
  }

  get mode() {
    return this._mode;
  }

  set mode(value: 'straight' | 'circular') {
    this._mode = value;
    this.paint();
  }

  get morphology() {
    return this._morphology;
  }

  set morphology(value: Morphology) {
    if (value === this._morphology) return;

    this._morphology = value;
    this.updateMorphology();
  }

  readonly init = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;

    if (this.context) this.delete();
    const context = canvas.getContext('2d');
    this.context = context;
    this.observer.observe(canvas);
    this.updateMorphology();
    canvas.addEventListener('pointermove', this.handlePointerMove);
    return this.delete;
  };

  readonly paint = () => {
    if (this.paintingScheduled) return;

    this.paintingScheduled = true;
    globalThis.requestAnimationFrame(this.actualPaint);
  };

  private readonly actualPaint = () => {
    if (this.mode === 'straight') this.paintStraight();
    else this.paintCircular();
  };

  private paintStraight() {
    this.paintingScheduled = false;
    const { context } = this;
    if (!context) return;

    const { canvas } = context;
    this.resizeCanvas(canvas);
    const { width, height } = canvas;
    context.lineCap = 'round';
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    const xCorner = MARGIN;
    const yCorner = MARGIN;
    const w = width - 2 * MARGIN;
    const h = height - 2 * MARGIN;
    const fx = (x: number) => 0.5 + Math.round(xCorner + w * x);
    const fy = (y: number) => 0.5 + Math.round(yCorner + h * y);
    context.lineWidth = this.lineWidth;
    for (const color of Object.keys(this.segments)) {
      const segments = this.segments[color];
      context.strokeStyle = color;
      context.beginPath();
      for (const { x0, y0, x1, y1 } of segments) {
        context.moveTo(fx(x0), fy(y0));
        context.lineTo(fx(x1), fy(y1));
      }
      context.stroke();
      const { hoveredSegment } = this;
      if (hoveredSegment) {
        context.save();
        context.globalAlpha = 0.2;
        context.strokeStyle = hoveredSegment.color;
        context.lineWidth = 4 * this.lineWidth;
        context.beginPath();
        const { x0, y0, x1, y1 } = hoveredSegment;
        context.moveTo(fx(x0), fy(y0));
        context.lineTo(fx(x1), fy(y1));
        context.stroke();
        context.restore();
      }
      context.fillStyle = color;
      const R = this.lineWidth * 2;
      for (const { x1, y1, leave } of segments) {
        if (leave) {
          context.beginPath();
          context.ellipse(fx(x1), fy(y1), R, R, 0, 0, 2 * Math.PI);
          context.fill();
        }
      }
    }
  }

  private paintCircular() {
    this.paintingScheduled = false;
    const { context } = this;
    if (!context) return;

    const { canvas } = context;
    this.resizeCanvas(canvas);
    const { width, height } = canvas;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    const w = width - 2 * MARGIN;
    const h = height - 2 * MARGIN;
    const radius = Math.min(w, h) / 2;
    const xc = width / 2;
    const yc = height / 2;
    const fx = (x: number, y: number) =>
      0.5 + Math.round(xc + Math.cos(2 * Math.PI * x) * (y * radius));
    const fy = (x: number, y: number) =>
      0.5 + Math.round(yc + Math.sin(2 * Math.PI * x) * (y * radius));
    context.lineWidth = this.lineWidth;
    for (const color of Object.keys(this.segments)) {
      const segments = this.segments[color];
      context.strokeStyle = color;
      context.beginPath();
      for (const { x0, y0, x1, y1 } of segments) {
        if (y0 === y1) continue;

        context.moveTo(fx(x0, y0), fy(x0, y0));
        context.lineTo(fx(x1, y1), fy(x1, y1));
      }
      context.stroke();
      const { hoveredSegment } = this;
      if (hoveredSegment) {
        context.save();
        context.globalAlpha = 0.2;
        context.strokeStyle = hoveredSegment.color;
        context.lineWidth = 4 * this.lineWidth;
        context.beginPath();
        const { x0, y0, x1, y1 } = hoveredSegment;
        context.moveTo(fx(x0, y0), fy(x0, y0));
        context.lineTo(fx(x1, y1), fy(x1, y1));
        context.stroke();
        context.restore();
      }
      context.fillStyle = color;
      const R = this.lineWidth * 2;
      for (const { x0, y0, x1, y1, leave } of segments) {
        if (y0 === y1) {
          context.globalAlpha = 0.5;
          context.beginPath();
          context.ellipse(xc, yc, y0 * radius, y0 * radius, 0, x0 * 2 * Math.PI, x1 * 2 * Math.PI);
          context.stroke();
          context.globalAlpha = 1;
        }
        if (leave) {
          context.beginPath();
          context.ellipse(fx(x1, y1), fy(x1, y1), R, R, 0, 0, 2 * Math.PI);
          context.fill();
        }
      }
    }
  }

  private updateMorphology() {
    const { context } = this;
    if (!context) return;

    const tree = createTreeStructure(this.morphology);
    this.grid = tree.grid;
    const segments: Record<string, Segment[]> = {};
    feedSegments(segments, tree.children, tree.levelsCount);
    this.segments = segments;
    this.paint();
  }

  private readonly delete = () => {
    const { context } = this;
    if (!context) return;

    this.context?.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.observer.unobserve(context.canvas);
    this.context = null;
  };

  private dispatchHover(item: TreeItem) {
    if (item === this.hoveredItem) return;

    this.hoveredItem = item;
    this.hoveredSegment = null;
    if (item) {
      // Search corresponding segment
      for (const segments of Object.values(this.segments)) {
        for (const segment of segments) {
          if (segment.item?.section.name === item.section.name) {
            this.hoveredSegment = segment;
            break;
          }
        }
        if (this.hoveredSegment) break;
      }
    }
    this.paint();
    this.eventHover.dispatch(item);
  }

  private readonly handlePointerMove = (evt: PointerEvent) => {
    const { grid } = this;
    const [x, y] = this.getNormalizedCoords(evt);
    const level = Math.floor(y * grid.length);
    const ranks = grid[level];
    if (!ranks) return;

    // Dichotomic search
    let a = 0;
    let b = ranks.length;
    while (b - a > 1) {
      const m = Math.round((a + b) / 2);
      const item = ranks[m];
      if (x > item.x) a = m;
      else b = m;
    }
    const xa = ranks[a]?.x ?? 999;
    const xb = ranks[b]?.x ?? 999;
    const hoveredItem = (Math.abs(x - xa) < Math.abs(x - xb) ? ranks[a] : ranks[b]) ?? null;
    this.dispatchHover(hoveredItem);
  };

  /**
   * Normalize coords between 0 and 1.
   * This depend on the display mode (straight, circular).
   */
  private getNormalizedCoords(evt: PointerEvent) {
    const { context } = this;
    if (!context) return [0, 0];

    const { canvas } = context;
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    if (this.mode === 'straight') return [x, y];

    // Circular
    let xx = 2 * x - 1;
    let yy = 2 * y - 1;
    if (rect.width > rect.height) {
      xx *= rect.width / rect.height;
    } else {
      yy *= rect.height / rect.width;
    }
    const angle = keepPositive(Math.atan2(yy, xx));
    const radius = Math.sqrt(xx * xx + yy * yy);
    return [angle / (2 * Math.PI), radius];
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    this.lineWidth = clamp(Math.min(canvas.width, canvas.height) / 600, 1, 3);
  }
}

function keepPositive(angle: number) {
  while (angle < 0) angle += 2 * Math.PI;
  return angle;
}

export function usePainterDendrogram(morphology: Morphology) {
  const [hoveredItem, setHoveredItem] = React.useState<TreeItem | null>(null);
  const ref = React.useRef<PainterDendrogram | null>(null);
  if (!ref.current) {
    const painter = new PainterDendrogram();
    ref.current = painter;
  }
  React.useEffect(() => {
    const painter = ref.current;
    if (!painter) return;

    painter.eventHover.addListener(setHoveredItem);
    painter.morphology = morphology;
    return () => painter.eventHover.removeListener(setHoveredItem);
  }, [morphology]);
  return { painter: ref.current, hoveredItem };
}

function feedSegments(
  segments: Record<string, Segment[]>,
  children: TreeItem[],
  levelsCount: number
) {
  for (const item of children) {
    feedSegments(segments, item.children, levelsCount);
    const color = resolveColor(item.section.name);
    const segmentsOfSameColor: Segment[] = getSegmentsOfColor(segments, color);
    const h = (item.children.length > 0 ? 1 : 0.8) / levelsCount;
    const { x, y } = item;
    segmentsOfSameColor.push({
      x0: x,
      y0: y,
      x1: x,
      y1: y + h,
      leave: item.children.length === 0,
      item,
      color,
    });
  }
  if (children.length > 1) {
    // Horizontal segments
    const [first] = children;
    const last = children[children.length - 1];
    const color = resolveColor(first.section.name);
    const segmentsHorizontal = getSegmentsOfColor(segments, color);
    const x0 = first.x;
    const x1 = last.x;
    const { y } = first;
    segmentsHorizontal.push({
      x0,
      y0: y,
      x1,
      y1: y,
      leave: false,
      color,
    });
  }
}

function resolveColor(name: string): string {
  const prefix = name.slice(0, 4).toLocaleLowerCase();
  switch (prefix) {
    case 'axon':
      return '#07f';
    case 'dend':
      return '#F55';
    case 'basa':
      return '#F33';
    case 'apic':
      return '#F8f';
    case 'myel':
      return `#778`;
    case 'soma':
      return '#dde';
    case 'hori':
      return '#7f75';
    default:
      return '#fff';
  }
}

function getSegmentsOfColor(segments: Record<string, Segment[]>, color: string): Segment[] {
  const item = segments[color];
  if (item) return item;

  const newItem: Segment[] = [];
  segments[color] = newItem;
  return newItem;
}
