/**
 * Shared canvas primitives for the "soma" explainer widgets. Everything is
 * drawn in CSS pixels; the caller supplies the layout.
 */

import { voltageColor } from '@/features/learn/lib/neuron/colormap';
import { screen } from '@/features/learn/lib/theme';

export const FONT = 'ui-sans-serif, -apple-system, Segoe UI, sans-serif';
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export const ION_COLORS = {
  K: '#60a5fa',
  Na: '#fb923c',
  Cl: '#34d399',
  Ca: '#f472b6',
  A: '#a78bfa',
} as const;

interface SomaLayout {
  cx: number;
  cy: number;
  /** Outer radius of the membrane, px. */
  r: number;
}

/** Deterministic PRNG so scattered ions do not jitter between frames. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fillPanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = screen();
  ctx.fillRect(0, 0, w, h);
}

/**
 * The soma itself: extracellular space, a lipid membrane ring and the
 * cytoplasm tinted by the membrane potential.
 */
export function drawSoma(
  ctx: CanvasRenderingContext2D,
  L: SomaLayout,
  vm: number,
  opts: { labels?: boolean; membrane?: number } = {}
) {
  const { labels = true, membrane = 7 } = opts;

  // cytoplasm
  const inner = L.r - membrane;
  const g = ctx.createRadialGradient(L.cx, L.cy, inner * 0.1, L.cx, L.cy, inner);
  g.addColorStop(0, voltageColor(vm, 0.55));
  g.addColorStop(1, voltageColor(vm, 0.22));
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // membrane
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, L.r - membrane / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(226,232,240,0.16)';
  ctx.lineWidth = membrane;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, L.r - membrane / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148,163,184,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, L.r - membrane + 0.5, 0, Math.PI * 2);
  ctx.stroke();

  if (labels) {
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.fillText('inside (cytoplasm)', L.cx, L.cy + L.r * 0.55);
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.fillText('outside', L.cx, L.cy - L.r - 14);
  }
}

/** A single ion as a small labelled disc. */
export function drawIon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  color: string,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (r >= 5) {
    ctx.fillStyle = screen(0.9);
    ctx.font = `600 ${Math.round(r * 1.1)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
  }
  ctx.restore();
}

/** A + or − sign, used for the charge layers on the two membrane faces. */
export function drawSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  positive: boolean,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  if (positive) {
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
  }
  ctx.stroke();
  ctx.restore();
}

interface ScaleMark {
  v: number;
  label: string;
  color: string;
}

/**
 * Vertical membrane-potential scale with reversal-potential ticks and a marker
 * for the current value.
 */
export function drawVoltageScale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  o: { vLo: number; vHi: number; marks: ScaleMark[]; value?: number; valueLabel?: string }
) {
  const w = 12;
  const yOf = (v: number) => y + ((o.vHi - v) / (o.vHi - o.vLo)) * h;

  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (let i = 0; i <= 10; i++) {
    g.addColorStop(i / 10, voltageColor(o.vHi - ((o.vHi - o.vLo) * i) / 10, 0.9));
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(148,163,184,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.font = `10px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const m of o.marks) {
    const my = yOf(m.v);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, my);
    ctx.lineTo(x + w + 4, my);
    ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.fillText(m.label, x + w + 8, my);
  }

  if (o.value !== undefined && Number.isFinite(o.value)) {
    const vy = yOf(Math.max(o.vLo, Math.min(o.vHi, o.value)));
    ctx.beginPath();
    ctx.moveTo(x - 7, vy);
    ctx.lineTo(x - 15, vy - 6);
    ctx.lineTo(x - 15, vy + 6);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.textAlign = 'right';
    ctx.font = `600 11px ${MONO}`;
    ctx.fillText(o.valueLabel ?? `${o.value.toFixed(1)} mV`, x - 19, vy);
  }
}

/** Rounded rectangle path helper. */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
