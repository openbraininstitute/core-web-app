/* eslint-disable no-param-reassign */
import React from 'react';

import { createTreeStructure, TreeItem } from './tree';

import { Morphology } from '@/services/bluenaas-single-cell/types';

const MARGIN = 8;

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

class PainterDendrogram {
  private _morphology: Morphology = {};

  private context: CanvasRenderingContext2D | null = null;

  private readonly observer: ResizeObserver;

  private paintingScheduled = false;

  private segments: Record<string, Segment[]> = {};

  constructor() {
    this.observer = new ResizeObserver(this.paint);
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

    const context = canvas.getContext('2d');
    this.context = context;
    this.observer.observe(canvas);
    this.updateMorphology();

    return this.delete;
  };

  readonly paint = () => {
    if (this.paintingScheduled) return;

    this.paintingScheduled = true;
    globalThis.requestAnimationFrame(this.actualPaint);
  };

  private readonly actualPaint = () => {
    this.paintingScheduled = false;
    const { context } = this;
    if (!context) return;

    const { canvas } = context;
    resizeCanvas(canvas);
    const { width, height } = canvas;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    const xCorner = MARGIN;
    const yCorner = MARGIN;
    const w = width - 2 * MARGIN;
    const h = height - 2 * MARGIN;
    const fx = (x: number) => 0.5 + Math.round(xCorner + w * x);
    const fy = (y: number) => 0.5 + Math.round(yCorner + h * y);
    context.lineWidth = 2;
    for (const color of Object.keys(this.segments)) {
      context.strokeStyle = color;
      context.beginPath();
      for (const { x0, y0, x1, y1 } of this.segments[color]) {
        context.moveTo(fx(x0), fy(y0));
        context.lineTo(fx(x1), fy(y1));
      }
      context.stroke();
    }
  };

  private updateMorphology() {
    const { context } = this;
    if (!context) return;

    createTreeStructure(this.morphology);
  }
}

export function usePainterDendrogram(morphology: Morphology) {
  const ref = React.useRef<PainterDendrogram | null>(null);
  if (!ref.current) ref.current = new PainterDendrogram();
  React.useEffect(() => {
    const painter = ref.current;
    if (!painter) return;

    painter.morphology = morphology;
  }, [morphology]);
  return ref.current;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
}

function feedSegments(segments: Record<string, Segment[]>, children: TreeItem[], levels: number[]) {
  for (const item of children) {
    feedSegments(segments, item.children, levels);
    const color = resolveColor(item.section.name);
    const segmentsOfSameColor: Segment[] = getSegmentsOfColor(segments, color);
    for (const { rank, level } of item.children) {
      const x = (rank + 0.5) / levels[level];
      const y = level / levels.length;
      const h = 1 / levels.length;
      segmentsOfSameColor.push({
        x0: x,
        y0: y,
        x1: x,
        y1: y + h,
      });
    }
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
