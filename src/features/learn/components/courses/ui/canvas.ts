/**
 * What the courses' canvas figures share: the page's look in either theme;
 * the room a figure may draw in — its box, or, spilling over the page, the
 * window round it, short of the words above and the slides' dots below; words
 * in the figures' italic serif; and the fades that keep a spilling figure from
 * the words and the dots.
 */

import { mix, type RGB, rgba } from '@/features/learn/components/heuristics/shared';
import { getTheme } from '@/features/learn/lib/theme';

export const SERIF = "Georgia, 'Times New Roman', serif";

/** How the page looks: its ink and paper, and a grey between; and whether it is the dark one. */
export interface Look {
  ink: RGB;
  page: RGB;
  grey: RGB;
  dark: boolean;
}
export function lookOf(): Look {
  const dark = getTheme() !== 'obi';
  const ink: RGB = dark ? [226, 232, 240] : [30, 41, 59];
  const page: RGB = dark ? [6, 9, 17] : [255, 255, 255];
  return { ink, page, grey: mix(page, ink, 0.32), dark };
}

/** The part of the page a figure may draw on, in its own coordinates. */
export interface Seen {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  spill: boolean;
}
export const seenOf = (): Seen => ({ x0: 0, y0: 0, x1: 0, y1: 0, spill: false });

/** Where a canvas figure is drawing this frame: its box — or, spilling over the page, the window round it. */
export function placeFrame(
  ctx: CanvasRenderingContext2D,
  seen: Seen,
  cw: number,
  ch: number,
  box: DOMRect | null | undefined
): [number, number] {
  if (box) {
    ctx.translate(box.left, box.top);
    Object.assign(seen, {
      x0: -box.left,
      y0: -box.top,
      x1: cw - box.left,
      y1: ch - box.top,
      spill: true,
    });
    return [Math.round(box.width), Math.round(box.height)];
  }
  Object.assign(seen, { x0: 0, y0: 0, x1: cw, y1: ch, spill: false });
  return [cw, ch];
}

/** The room a figure fills: as far above its box as below it, and a little past its sides. */
export interface Room {
  top: number;
  foot: number;
  left: number;
  right: number;
}
export function roomOf(seen: Seen, w: number, th: number): Room {
  const below = Math.max(0, seen.y1 - 64 - th);
  const [top, foot] = seen.spill ? [-Math.max(0, below - 14), th + below] : [0, th];
  const spare = seen.spill ? Math.max(0, Math.min(150, -seen.x0 - 16, seen.x1 - w - 16)) : 0;
  return { top, foot, left: -spare, right: w + spare };
}

/** Words in the figures' serif — italic unless told otherwise — with a halo of the page if asked. */
export function words(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: RGB,
  alpha: number,
  size = 12,
  align: CanvasTextAlign = 'left',
  halo: RGB | null = null,
  style = 'italic'
) {
  if (alpha < 0.01 || !text) return;
  ctx.font = `${style} ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba(halo, 0.85 * alpha);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = rgba(colour, alpha);
  ctx.fillText(text, x, y);
}

/** An arrow from (x0, y0) to (x1, y1), its head at the end. */
export function arrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colour: RGB,
  alpha: number,
  width = 2,
  head = 8
) {
  if (alpha < 0.01) return;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ctx.fillStyle = rgba(colour, 1);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(angle) * head * 0.6, y1 - Math.sin(angle) * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(angle - 0.42), y1 - head * Math.sin(angle - 0.42));
  ctx.lineTo(x1 - head * Math.cos(angle + 0.42), y1 - head * Math.sin(angle + 0.42));
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** How far under the words above the figure it fades out, and over how far; and over the slides' dots below. */
const FADE_UNDER = 28;
const FADE_FOR = 56;
const FOOT_OVER = 6;
const FOOT_FOR = 48;
/** Spilling over the page, nothing drawn behind the words above the figure, nor behind the slides' dots below it. */
export function fadeEdges(
  ctx: CanvasRenderingContext2D,
  seen: Seen,
  box: DOMRect,
  frame: HTMLElement | null
) {
  const width = seen.x1 - seen.x0;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const said = frame?.parentElement?.previousElementSibling;
  const line =
    (said ? said.getBoundingClientRect().bottom : box.top - FADE_UNDER) + FADE_UNDER - box.top;
  ctx.fillStyle = '#000';
  ctx.fillRect(seen.x0, seen.y0, width, Math.max(0, line - FADE_FOR - seen.y0));
  const above = ctx.createLinearGradient(0, line - FADE_FOR, 0, line);
  above.addColorStop(0, 'rgba(0, 0, 0, 1)');
  above.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = above;
  ctx.fillRect(seen.x0, line - FADE_FOR, width, FADE_FOR);
  const foot = frame?.closest('main')?.nextElementSibling;
  if (foot) {
    const floor = foot.getBoundingClientRect().top - FOOT_OVER - box.top;
    ctx.fillStyle = '#000';
    ctx.fillRect(seen.x0, floor, width, Math.max(0, seen.y1 - floor));
    const below = ctx.createLinearGradient(0, floor - FOOT_FOR, 0, floor);
    below.addColorStop(0, 'rgba(0, 0, 0, 0)');
    below.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = below;
    ctx.fillRect(seen.x0, floor - FOOT_FOR, width, FOOT_FOR);
  }
  ctx.restore();
}

/** `k` of the way between two sets of numbers alike, nested objects and arrays included. */
export function blend<T>(a: T, b: T, k: number): T {
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * k) as T;
  if (Array.isArray(a) && Array.isArray(b)) return b.map((v, i) => blend(a[i] ?? v, v, k)) as T;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(b)) {
      out[key] = blend((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], k);
    }
    return out as T;
  }
  return k < 0.5 ? a : b;
}

/**
 * A line of text split into its plain runs, its subscripts — `g_K`, or `_{axial}` for a longer one — and its
 * superscripts: `Ca^{2+}`. `shift` is 1 lowered, -1 raised, 0 neither.
 */
function scripts(text: string) {
  const parts: { text: string; shift: number }[] = [];
  const re = /([_^])(\{[^}]*\}|[A-Za-z0-9]+)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), shift: 0 });
    parts.push({ text: m[2].replace(/^\{|\}$/g, ''), shift: m[1] === '_' ? 1 : -1 });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), shift: 0 });
  return parts;
}

/** How wide `text` is set as `mathWords` sets it. */
export function mathWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  size = 14,
  style = 'italic'
) {
  return scripts(text).reduce((w, p) => {
    ctx.font = `${style} ${p.shift ? size * 0.68 : size}px ${SERIF}`;
    return w + ctx.measureText(p.text).width;
  }, 0);
}

/** Words as a formula sets them: anything after an underscore small and lowered, as a subscript; after a caret, raised. */
export function mathWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: RGB,
  alpha: number,
  size = 14,
  align: CanvasTextAlign = 'left',
  halo: RGB | null = null,
  style = 'italic'
) {
  if (alpha < 0.01 || !text) return;
  const total = mathWidth(ctx, text, size, style);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const p of scripts(text)) {
    ctx.font = `${style} ${p.shift ? size * 0.68 : size}px ${SERIF}`;
    const yy = y + (p.shift > 0 ? 0.3 : p.shift < 0 ? -0.36 : 0) * size;
    if (halo) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = rgba(halo, 0.85 * alpha);
      ctx.strokeText(p.text, cx, yy);
    }
    ctx.fillStyle = rgba(colour, alpha);
    ctx.fillText(p.text, cx, yy);
    cx += ctx.measureText(p.text).width;
  }
}
