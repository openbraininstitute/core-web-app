/**
 * The skeleton figure's colours: what each layer is drawn in for each way of showing it, written as
 * linear RGB floats into vertex colours, as three.js keeps them, from the fixed colours in
 * `colours.ts`. The legend draws the same CSS colours, and the ramps blend in sRGB, as a CSS
 * gradient does. No three.js here.
 */

import chroma from 'chroma-js';

import { DIM, HEIGHT_RAMP, LENGTH_RAMP, LIT, PLAIN, SOMA_SECTION, TYPE_COLOURS } from './colours';

import type { SkeletonMode, SpineMode } from './view';

export {
  AXIS_COLOURS,
  DIM,
  GLASS,
  HEIGHT_RAMP,
  LENGTH_RAMP,
  LIT,
  MEMBRANE,
  PLAIN,
  SOMA_SECTION,
  TYPE_COLOURS,
  TYPE_NAMES,
} from './colours';

export type RGB = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** A CSS hex colour's sRGB, 0 to 1. */
export function srgbOf(hex: string): RGB {
  const v = Number.parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** A CSS hex colour in linear RGB. */
export function linearOf(hex: string): RGB {
  return srgbOf(hex).map(toLinear) as RGB;
}

/** The colour `t` of the way along evenly spaced stops (clamped), blended in sRGB, in linear RGB. */
export function rampAt(stops: readonly string[], t: number): RGB {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const a = srgbOf(stops[i]),
    b = srgbOf(stops[i + 1]);
  const f = x - i;
  return [0, 1, 2].map((k) => toLinear(a[k] + (b[k] - a[k]) * f)) as RGB;
}

/**
 * `n` vivid colours that read on dark and stand apart: the golden angle round OKLCH's hues, leaving
 * out the band round the dendrites' blue, a little lighter and darker in turn, each as saturated as
 * sRGB holds. CSS hex.
 */
export function spinePalette(n: number): string[] {
  const from = 285,
    span = 280;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const hue = (from + ((i * 0.618034 + 0.13) % 1) * span) % 360;
    const lightness = i % 2 === 0 ? 0.78 : 0.7;
    let c = 0.17;
    while (c > 0 && chroma.oklch(lightness, c, hue).clipped()) c -= 0.005;
    out.push(chroma.oklch(lightness, Math.max(0, c), hue).hex());
  }
  return out;
}

function put(target: Float32Array, item: number, c: RGB): void {
  target[3 * item] = c[0];
  target[3 * item + 1] = c[1];
  target[3 * item + 2] = c[2];
}

/**
 * The skeleton's vertex colours: by each vertex's SWC type, all `PLAIN`, section `lit` (a parseSwc
 * index) bright and the rest dim, or each section its colour in `palette` (by parseSwc index). 'off'
 * leaves them as they are.
 */
export function paintSkeleton(
  target: Float32Array,
  sections: Uint16Array,
  types: Uint8Array,
  mode: SkeletonMode,
  lit: number,
  palette: readonly string[] = []
): void {
  if (mode === 'off') return;
  const plain = linearOf(PLAIN),
    dim = linearOf(DIM),
    bright = linearOf(LIT);
  const byType = new Map<number, RGB>();
  const bySection = palette.map(linearOf);
  for (let v = 0; v < sections.length; v++) {
    let c: RGB;
    if (mode === 'plain') c = plain;
    else if (mode === 'section') c = sections[v] === lit ? bright : dim;
    else if (mode === 'sections') c = bySection[sections[v]] ?? plain;
    else {
      const t = types[v];
      if (!byType.has(t)) byType.set(t, linearOf(TYPE_COLOURS[t] ?? PLAIN));
      c = byType.get(t) as RGB;
    }
    put(target, v, c);
  }
}

/** The soma's colour in each way of showing the skeleton, CSS. */
export function somaColour(mode: SkeletonMode): string {
  if (mode === 'type') return TYPE_COLOURS[1];
  if (mode === 'sections') return SOMA_SECTION;
  return mode === 'section' ? DIM : PLAIN;
}

/** What the spines' colours are worked out from. */
export interface SpinePaintData {
  vertexStart: Uint32Array;
  /** Per vertex, µm along its spine from its dendrite (`distanceAlongSpines`). */
  distance: Float32Array;
  /** Per spine, its extent along its axis, µm. */
  extent: Float32Array;
  length: Float32Array;
  lengthRange: readonly [number, number];
  /** afferent_section_id per spine. */
  section: Int32Array;
  /** The spine shown close up, and the afferent_section_id lit. */
  chosen: number;
  litSection: number;
  /** One CSS colour per spine. */
  palette: readonly string[];
  /** One CSS colour per section, by parseSwc index, and afferent_section_id less that index. */
  sectionPalette: readonly string[];
  sectionIdOffset: number;
}

/** The range, µm, that the distance ramp spans in a mode: the chosen spine's, or the longest's. */
export function heightRange(mode: SpineMode, d: SpinePaintData): number {
  if (mode === 'one') return d.extent[d.chosen] || 1;
  let most = 0;
  for (const e of d.extent) most = Math.max(most, e);
  return most || 1;
}

/**
 * The spines' vertex colours: each its own; by distance along it from its dendrite, over the longest
 * spine's extent; by its length, over the length range; the chosen one by distance over its own
 * extent and the rest dim; the lit section's own colours and the rest dim; each in its section's
 * colour; spine `picked` its own colour and the rest dim; or all dim. 'off' leaves them.
 */
export function paintSpines(
  target: Float32Array,
  mode: SpineMode,
  d: SpinePaintData,
  picked = d.chosen
): void {
  if (mode === 'off') return;
  const n = d.vertexStart.length - 1;
  const dim = linearOf(DIM);
  const range = heightRange(mode, d);
  const [lo, hi] = d.lengthRange;
  for (let i = 0; i < n; i++) {
    const own = linearOf(d.palette[i % d.palette.length]);
    const lengthColour = rampAt(LENGTH_RAMP, (d.length[i] - lo) / (hi - lo || 1));
    const sectionColour = d.sectionPalette[d.section[i] - d.sectionIdOffset];
    for (let v = d.vertexStart[i]; v < d.vertexStart[i + 1]; v++) {
      let c: RGB;
      if (mode === 'each') c = own;
      else if (mode === 'length') c = lengthColour;
      else if (mode === 'section') c = d.section[i] === d.litSection ? own : dim;
      else if (mode === 'sections') c = sectionColour ? linearOf(sectionColour) : dim;
      else if (mode === 'picked') c = i === picked ? own : dim;
      else if (mode === 'others' || (mode === 'one' && i !== d.chosen)) c = dim;
      else c = rampAt(HEIGHT_RAMP, d.distance[v] / range);
      put(target, v, c);
    }
  }
}
