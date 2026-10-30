'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { COLOUR_TABLE } from '@/features/lfp-viewer/colour-scale';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { TIME_CURSOR_COLOR } from '@/features/sonata-viewer/time-cursor';
import { computeTicks, formatTick } from '@/features/spike-viewer/renderer/axis-overlay';

import type { ReactNode } from 'react';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';

export type FieldPlotMode = 'traces' | 'map';

const MARGIN = { left: 52, right: 10, top: 6, bottom: 22 };
const INK = '#002766';
const AXIS = '#bfbfbf';
const LABEL = '#8c8c8c';
const SELECTED = '#f5222d';
/** A drag shorter than this is a click. */
const DRAG_PX = 4;

type Props = {
  mode: FieldPlotMode;
  field: LfpField;
  scale: ColourScale;
  /** The contacts drawn as traces, top to bottom. */
  traces: readonly number[];
  /** The traced contacts at full resolution, a row each in the order of `traces`, once read. */
  traceField: LfpField | null;
  /** How many times the shared gain the traces are drawn at. */
  gain: number;
  window: [number, number];
  onWindowChange: (window: [number, number] | null) => void;
  selectedContact: number | null;
  onContactClick: (contact: number) => void;
  onSeek: (timeInMs: number) => void;
  timeCursor: TimeCursor;
  /** Under the plot, lined up with it: given the plot's left and right edges. */
  footer: (left: number, right: number) => ReactNode;
};

/** A contact's lowest and highest µV over bins [from, to). */
function extent(field: LfpField, contact: number, from: number, to: number): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  const row = contact * field.bins;
  if (field.kind === 'value') {
    for (let b = from; b < to; b++) {
      const v = field.data[row + b];
      if (v < low) low = v;
      if (v > high) high = v;
    }
  } else {
    for (let b = from; b < to; b++) {
      const lo = field.data[(row + b) * 2];
      const hi = field.data[(row + b) * 2 + 1];
      if (lo < low) low = lo;
      if (hi > high) high = hi;
    }
  }
  return [low * field.scale, high * field.scale];
}

/** The bins of a field over [from, to) ms, clamped to the run. */
function binRange(field: LfpField, from: number, to: number): [number, number] {
  return [
    Math.max(0, Math.floor((from - field.start) / field.binMs)),
    Math.min(field.bins, Math.ceil((to - field.start) / field.binMs)),
  ];
}

/**
 * The field over time: stacked traces of a few contacts, each drawn as its
 * lowest-to-highest value per pixel so no peak is lost, or every contact as a
 * row of colour. Dragging zooms into a span of time, a double-click zooms back
 * out, and a click moves the player there, and in the map picks the row's contact.
 */
export function FieldPlot({
  mode,
  field,
  scale,
  traces,
  traceField,
  gain,
  window: [from, to],
  onWindowChange,
  selectedContact,
  onContactClick,
  onSeek,
  timeCursor,
  footer,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: box.clientWidth, height: box.clientHeight })
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const plot = {
    left: MARGIN.left,
    right: Math.max(MARGIN.left + 1, size.width - MARGIN.right),
    top: MARGIN.top,
    bottom: Math.max(MARGIN.top + 1, size.height - MARGIN.bottom),
  };
  const xOf = (t: number) => plot.left + ((t - from) / (to - from)) * (plot.right - plot.left);
  const timeOf = (x: number) => from + ((x - plot.left) / (plot.right - plot.left)) * (to - from);
  const rows = mode === 'map' ? field.contacts : traces.length;
  const fullTraces = mode === 'traces' ? traceField : null;
  const rowOf = (y: number) =>
    Math.min(rows - 1, Math.max(0, Math.floor(((y - plot.top) / (plot.bottom - plot.top)) * rows)));
  const contactOf = (y: number) => (mode === 'map' ? rowOf(y) : (traces[rowOf(y)] ?? null));

  // The map's image, a pixel per contact and bin over the whole run; a window crops it.
  const mapImage = useMemo(() => {
    if (mode !== 'map' || field.bins === 0 || typeof document === 'undefined') return null;
    const image = new ImageData(field.bins, field.contacts);
    const pixels = new Uint32Array(image.data.buffer);
    for (let c = 0; c < field.contacts; c++) {
      for (let b = 0; b < field.bins; b++) {
        const uv = fieldValue(field, c, b);
        pixels[c * field.bins + b] = COLOUR_TABLE[Math.round(((scale.position(uv) + 1) / 2) * 255)];
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = field.bins;
    canvas.height = field.contacts;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
    return canvas;
  }, [mode, field, scale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: xOf and the plot's edges follow from size, from and to
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size.width, size.height);
    g.font = '10px sans-serif';
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;

    const [firstBin, lastBin] = binRange(field, from, to);
    if (mode === 'map' && mapImage && lastBin > firstBin) {
      g.imageSmoothingEnabled = false;
      const x0 = xOf(field.start + firstBin * field.binMs);
      const x1 = xOf(field.start + lastBin * field.binMs);
      g.save();
      g.beginPath();
      g.rect(plot.left, plot.top, plotWidth, plotHeight);
      g.clip();
      g.drawImage(
        mapImage,
        firstBin,
        0,
        lastBin - firstBin,
        field.contacts,
        x0,
        plot.top,
        x1 - x0,
        plotHeight
      );
      g.restore();
      g.fillStyle = LABEL;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      for (const c of computeTicks(0, field.contacts - 1, plotHeight / 40, true)) {
        g.fillText(`e${c}`, plot.left - 6, plot.top + ((c + 0.5) / field.contacts) * plotHeight);
      }
      if (selectedContact !== null) {
        const y = plot.top + ((selectedContact + 0.5) / field.contacts) * plotHeight;
        g.fillStyle = SELECTED;
        g.beginPath();
        g.moveTo(plot.left - 4, y);
        g.lineTo(plot.left, y - 4);
        g.lineTo(plot.left, y + 4);
        g.fill();
      }
    }

    if (mode === 'traces' && traces.length > 0) {
      const rowHeight = plotHeight / traces.length;
      // The scale's limit spans most of a row; more gain lets traces overlap, as raw data does.
      const pxPerUv = (rowHeight * 0.45 * gain) / scale.limit;
      // The traced rows at full resolution where they are in, else the overview's.
      const source = traceField ?? field;
      const [first, last] = binRange(source, from, to);
      const binsPerPx = (last - first) / plotWidth;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      traces.forEach((contact, row) => {
        const base = plot.top + (row + 0.5) * rowHeight;
        const at = traceField ? row : contact;
        g.fillStyle = contact === selectedContact ? SELECTED : LABEL;
        g.fillText(`e${contact}`, plot.left - 6, base);
        g.strokeStyle = contact === selectedContact ? SELECTED : INK;
        g.lineWidth = 1;
        g.beginPath();
        if (binsPerPx <= 1) {
          for (let b = first; b < last; b++) {
            const [low, high] = extent(source, at, b, b + 1);
            const x = xOf(source.start + (b + 0.5) * source.binMs);
            const v = source.kind === 'value' ? low : (low + high) / 2;
            if (b === first) g.moveTo(x, base - v * pxPerUv);
            else g.lineTo(x, base - v * pxPerUv);
          }
        } else {
          for (let px = 0; px < plotWidth; px++) {
            const b0 = first + Math.floor(px * binsPerPx);
            const b1 = Math.min(last, Math.max(b0 + 1, first + Math.floor((px + 1) * binsPerPx)));
            const [low, high] = extent(source, at, b0, b1);
            g.moveTo(plot.left + px + 0.5, base - high * pxPerUv);
            g.lineTo(plot.left + px + 0.5, base - low * pxPerUv + 0.5);
          }
        }
        g.stroke();
      });
    }

    // The time axis.
    g.strokeStyle = AXIS;
    g.beginPath();
    g.moveTo(plot.left, plot.bottom + 0.5);
    g.lineTo(plot.right, plot.bottom + 0.5);
    g.stroke();
    g.fillStyle = LABEL;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const ticks = computeTicks(from, to, plotWidth / 80);
    const tickStep = ticks.length > 1 ? ticks[1] - ticks[0] : to - from;
    const unitLeft = size.width - 2 - g.measureText('ms').width - 4;
    for (const t of ticks) {
      const x = xOf(t);
      g.beginPath();
      g.moveTo(x, plot.bottom);
      g.lineTo(x, plot.bottom + 4);
      g.stroke();
      const label = formatTick(t, tickStep);
      if (x + g.measureText(label).width / 2 <= unitLeft) g.fillText(label, x, plot.bottom + 6);
    }
    g.textAlign = 'right';
    g.fillText('ms', size.width - 2, plot.bottom + 6);
  }, [size, mode, mapImage, field, scale, traces, traceField, gain, from, to, selectedContact]);

  // The player's time, moved outside React.
  // biome-ignore lint/correctness/useExhaustiveDependencies: xOf follows from size, from and to
  useEffect(
    () =>
      timeCursor.subscribe((t) => {
        const el = cursorRef.current;
        if (!el) return;
        const visible = t !== null && t >= from && t <= to;
        el.style.display = visible ? 'block' : 'none';
        if (visible) el.style.left = `${xOf(t)}px`;
      }),
    [timeCursor, from, to, size]
  );

  const localX = (e: React.PointerEvent) =>
    e.clientX - (boxRef.current?.getBoundingClientRect().left ?? 0);
  const localY = (e: React.PointerEvent) =>
    e.clientY - (boxRef.current?.getBoundingClientRect().top ?? 0);
  const inPlot = (x: number) => Math.min(plot.right, Math.max(plot.left, x));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={boxRef}
        className="relative min-h-0 flex-1 cursor-crosshair select-none"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const x = inPlot(localX(e));
          setDrag({ x0: x, x1: x });
        }}
        onPointerMove={(e) => {
          const x = localX(e);
          const y = localY(e);
          if (drag) setDrag({ ...drag, x1: inPlot(x) });
          if (x < plot.left || x > plot.right || y < plot.top || y > plot.bottom || rows === 0) {
            setHover(null);
            return;
          }
          const contact = contactOf(y);
          const t = timeOf(x);
          if (contact === null) {
            setHover(null);
            return;
          }
          const uv = fullTraces
            ? fieldValue(fullTraces, rowOf(y), binAt(fullTraces, t))
            : fieldValue(field, contact, binAt(field, t));
          setHover(`e${contact} · ${t.toFixed(1)} ms · ${uv.toFixed(1)} µV`);
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e) => {
          if (!drag) return;
          setDrag(null);
          if (Math.abs(drag.x1 - drag.x0) < DRAG_PX) {
            onSeek(timeOf(drag.x0));
            const contact = contactOf(localY(e));
            if (contact !== null && mode === 'map') onContactClick(contact);
            return;
          }
          const a = timeOf(Math.min(drag.x0, drag.x1));
          const b = timeOf(Math.max(drag.x0, drag.x1));
          if (b - a >= (fullTraces ?? field).binMs * 2) onWindowChange([a, b]);
        }}
        onDoubleClick={() => onWindowChange(null)}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div
          ref={cursorRef}
          className="pointer-events-none absolute w-px"
          style={{
            top: plot.top,
            height: Math.max(0, plot.bottom - plot.top),
            background: TIME_CURSOR_COLOR,
            display: 'none',
          }}
        />
        {drag && Math.abs(drag.x1 - drag.x0) >= DRAG_PX && (
          <div
            className="bg-primary-9/10 border-primary-9/40 pointer-events-none absolute border-x"
            style={{
              left: Math.min(drag.x0, drag.x1),
              width: Math.abs(drag.x1 - drag.x0),
              top: plot.top,
              height: plot.bottom - plot.top,
            }}
          />
        )}
        {hover && (
          <div className="pointer-events-none absolute top-1 right-3 rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-neutral-600 tabular-nums shadow-sm">
            {hover}
          </div>
        )}
      </div>
      {size.width > 0 && footer(plot.left, plot.right)}
    </div>
  );
}
