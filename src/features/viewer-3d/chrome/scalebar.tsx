import { useEffect, useRef, useState } from 'react';

import { useLatest } from '@/ui/hooks/use-latest';

import type { ViewControls } from '../engine/scene-viewer';

/** A label's units, each a thousandth of the one before. */
const UNITS = ['m', 'mm', 'μm', 'nm', 'pm', 'fm'];
/** What a major tick may stand for, in its unit. */
const VALUES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 300, 400, 500, 600, 700, 800, 900];
/** Every value in every unit, and how many µm it is, shortest first. */
const TICKS = UNITS.flatMap((unit, u) =>
  VALUES.map((value) => ({ value, unit, um: value * 10 ** (6 - 3 * u) }))
).sort((a, b) => a.um - b.um);
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
    const resize = () => {
      const ratio = pixelRatio();
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      paint(canvas, latest.current.scale, latest.current.color);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // The window taken to a screen of another pixel ratio, or the page zoomed, leaves the CSS size as it was.
    let ratioQuery: MediaQueryList | null = null;
    const onRatio = () => {
      resize();
      watchRatio();
    };
    const watchRatio = () => {
      ratioQuery?.removeEventListener('change', onRatio);
      ratioQuery = matchMedia(`(resolution: ${pixelRatio()}dppx)`);
      ratioQuery.addEventListener('change', onRatio);
    };
    watchRatio();
    return () => {
      observer.disconnect();
      ratioQuery?.removeEventListener('change', onRatio);
    };
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

/**
 * What a major tick stands for, in a unit of `UNITS`, and how far apart two are in CSS pixels: the least value at
 * least `minStep` apart, or, where none of those fits the ruler, the largest that does.
 */
export function majorTick(
  rulerHeight: number,
  umPerPixel: number,
  minStep: number
): { value: number; unit: string; step: number } {
  const fitting = TICKS.filter(({ um }) => um / umPerPixel <= rulerHeight);
  const { value, unit, um } =
    fitting.find((tick) => tick.um / umPerPixel >= minStep) ?? fitting.at(-1) ?? TICKS[0];
  return { value, unit, step: um / umPerPixel };
}

/**
 * The ruler up from the bottom of the canvas, as many major ticks long as fit, each where its value is at the view's
 * scale, and four minor ones between two. Lines a device pixel wide, on the device pixels.
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

  // A tick that falls on the top within rounding is kept.
  const count = Math.max(1, Math.floor(span / step + 1e-6));
  const majors = Array.from({ length: count + 1 }, (_, m) => snap(bottom - m * step));
  const tick = (y: number, length: number) => {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y);
    context.stroke();
  };

  context.beginPath();
  context.moveTo(x, majors[count]);
  context.lineTo(x, bottom);
  context.stroke();
  const between = step / MINORS_PER_MAJOR;
  for (let m = 0; m < count; m++) {
    for (let k = 1; k < MINORS_PER_MAJOR; k++)
      tick(snap(bottom - m * step - k * between), MINOR_LENGTH);
  }
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  majors.forEach((y, m) => {
    tick(y, MAJOR_LENGTH);
    context.fillText(`${m * value} ${unit}`, x + MAJOR_LENGTH + LABEL_GAP, y);
  });
}
