import { useEffect, useRef, useState } from 'react';

import { useLatest } from '@/ui/hooks/use-latest';

import type { ViewControls } from '../engine/scene-viewer';

/** A label's units, each a thousandth of the one before. */
const UNITS = ['m', 'mm', 'μm', 'nm', 'pm', 'fm'];
/** What a major tick may stand for, in its unit. */
const VALUES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 300, 400, 500, 600, 700, 800, 900];
const MAJOR_LENGTH = 10;
const MINOR_LENGTH = 5;
const MINORS_PER_MAJOR = 5;
const FONT_SIZE = 10;
const LABEL_GAP = 4;
const LABEL_WIDTH = 40;
/** The ruler's line, a major tick's length in from the left, and the ticks and labels right of it. */
const LINE_X = MAJOR_LENGTH;
const WIDTH = LINE_X + MAJOR_LENGTH + LABEL_GAP + LABEL_WIDTH + 1;

/**
 * The ruler down the bottom left of a view, ticked and labelled on its right, as morphoviewer drew it for the circuit
 * viewer. It reads the viewer's µm per CSS pixel, and shows nothing without one, in perspective.
 */
export function Scalebar({ viewer, color }: { viewer: ViewControls; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const latest = useLatest({ scale, color });

  useEffect(() => {
    setScale(viewer.currentPixelScale);
    return viewer.onPixelScaleChange(setScale);
  }, [viewer]);

  useEffect(() => {
    if (ref.current) paint(ref.current, scale, color);
  }, [scale, color]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const ratio = pixelRatio();
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      paint(canvas, latest.current.scale, latest.current.color);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [latest]);

  return (
    <div
      className="pointer-events-none absolute bottom-[10px] left-0 z-3 h-[min(180px,42%)]"
      style={{ width: WIDTH }}
    >
      <canvas ref={ref} className="block size-full" />
    </div>
  );
}

function pixelRatio(): number {
  return Math.max(1, globalThis.devicePixelRatio || 1);
}

/** What a major tick stands for, in a unit of `UNITS`, and how far apart two are in CSS pixels. */
export function majorTick(
  rulerHeight: number,
  umPerPixel: number,
  minStep: number
): { value: number; unit: string; step: number } {
  const steps = Math.max(1, Math.floor(rulerHeight / minStep));
  let factor = 1e-6;
  let stepValue = (rulerHeight / steps) * umPerPixel * factor;
  let unit = '?';
  for (const candidate of UNITS) {
    unit = candidate;
    if (stepValue >= 1) break;
    stepValue *= 1e3;
    factor *= 1e3;
  }
  let value = 1;
  for (const candidate of VALUES) {
    if (candidate > stepValue) break;
    value = candidate;
  }
  return { value, unit, step: value / (umPerPixel * factor) };
}

/**
 * The ruler from the bottom of the canvas to its top, with as many major ticks as fit one apart, spread evenly over
 * it, and four minor ones between two. Lines a device pixel wide, on the device pixels.
 */
function paint(canvas: HTMLCanvasElement, umPerPixel: number | null, color: string): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = pixelRatio();
  const height = canvas.height / ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, canvas.width / ratio, height);
  if (umPerPixel === null || umPerPixel <= 0) return;

  // An odd number of device pixels wide is centred on a pixel's middle.
  const lineWidth = Math.max(1, Math.round(ratio));
  const half = lineWidth % 2 ? 0.5 : 0;
  const snap = (css: number) => (Math.round(css * ratio - half) + half) / ratio;
  context.lineWidth = lineWidth / ratio;
  context.fillStyle = color;
  context.strokeStyle = color;
  context.font = `${FONT_SIZE}px ${getComputedStyle(canvas).fontFamily}`;

  const sample = context.measureText('999 mm');
  const textHeight = sample.actualBoundingBoxAscent + sample.actualBoundingBoxDescent;
  const x = snap(LINE_X);
  const pad = Math.ceil(textHeight / 2) + 1;
  const top = snap(pad);
  const bottom = snap(height - pad);
  const span = bottom - top;
  if (span <= 0) return;
  const { value, unit, step } = majorTick(span, umPerPixel, 3 * textHeight);
  if (!Number.isFinite(step) || step <= 0) return;

  const count = Math.max(1, Math.round(span / step));
  const majors = Array.from({ length: count + 1 }, (_, m) => snap(bottom - (m / count) * span));
  const tick = (y: number, length: number) => {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y);
    context.stroke();
  };

  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x, bottom);
  context.stroke();
  for (let m = 0; m < count; m++) {
    const between = (majors[m] - majors[m + 1]) / MINORS_PER_MAJOR;
    for (let k = 1; k < MINORS_PER_MAJOR; k++) tick(snap(majors[m] - k * between), MINOR_LENGTH);
  }
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  majors.forEach((y, m) => {
    tick(y, MAJOR_LENGTH);
    context.fillText(`${m * value} ${unit}`, x + MAJOR_LENGTH + LABEL_GAP, y);
  });
}
