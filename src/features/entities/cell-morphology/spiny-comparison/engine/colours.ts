/**
 * The comparison view's colours, as CSS, and the spines' vertex colours worked out from them: linear RGB bytes, as
 * three.js reads a normalised colour attribute. The legend names the same CSS colours.
 */

import type { SpineMeshes } from './types';

/** The SWC types' colours: the soma warm, the dendrites a calm blue that no spine's colour is near. */
export const TYPE_COLOURS: Readonly<Record<number, string>> = {
  1: '#f0b45e',
  2: '#c4b5fd',
  3: '#5b9cf2',
  4: '#f472b6',
};
export const TYPE_NAMES: Readonly<Record<number, string>> = {
  1: 'Soma',
  2: 'Axon',
  3: 'Basal dendrite',
  4: 'Apical dendrite',
};
export const OTHER_TYPE = '#8d99ad';
/** Spine length, short to long: viridis, from where it reads on dark. */
export const LENGTH_RAMP = ['#3b528b', '#21918c', '#5ec962', '#fde725'] as const;

/**
 * Path distance from the soma, near to far: a turbo-like rainbow through blue, cyan, green, yellow and orange to red,
 * its darkest ends left out so that it reads on dark.
 */
export const DISTANCE_RAMP = [
  '#4662d7',
  '#36aaf9',
  '#1ae4b6',
  '#72fe5e',
  '#c7ef34',
  '#fbb938',
  '#f56918',
  '#d23105',
] as const;

export type SpineColouring = 'each' | 'length' | 'distance' | 'section';

type RGB = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function srgbOf(hex: string): RGB {
  const v = Number.parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function linearOf(hex: string): RGB {
  return srgbOf(hex).map(toLinear) as RGB;
}

/** An HSL colour (h in degrees, s and l 0 to 1) in linear RGB. */
function hsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(toLinear) as RGB;
}

/**
 * The `i`th of a run of vivid colours that stand apart: the golden angle round the hues, leaving out the band round
 * the dendrites' blue, a little lighter and darker in turn.
 */
export function vivid(i: number): RGB {
  const hue = (285 + ((i * 0.618034 + 0.13) % 1) * 280) % 360;
  return hsl(hue, 0.82, i % 2 === 0 ? 0.64 : 0.56);
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

/** The range of the spines' lengths, µm, leaving out the few longest. */
export function lengthRange(length: Float32Array): [number, number] {
  if (length.length === 0) return [0, 1];
  const sorted = Float32Array.from(length).sort();
  return [sorted[0], sorted[Math.floor(0.98 * (sorted.length - 1))] || 1];
}

/**
 * How far from the soma along the dendrites the distance ramp reaches, µm: as far as all but the farthest 2% of spines,
 * so that a long tuft does not leave the rest of the cell in one colour.
 */
export function distanceReach(spines: SpineMeshes): number {
  const d = Float32Array.from(spines.somaDistance.filter(Number.isFinite)).sort();
  if (d.length === 0) return 1;
  return d[Math.floor(0.98 * (d.length - 1))] || d[d.length - 1] || 1;
}

/** Each spine's vertices coloured as `mode` says, into `out`: three bytes a vertex. */
export function paintSpines(out: Uint8Array, spines: SpineMeshes, mode: SpineColouring): void {
  const n = spines.vertexStart.length - 1;
  const [lo, hi] = lengthRange(spines.length);
  const reach = distanceReach(spines);
  for (let i = 0; i < n; i++) {
    const c =
      mode === 'length'
        ? rampAt(LENGTH_RAMP, (spines.length[i] - lo) / (hi - lo || 1))
        : mode === 'distance'
          ? rampAt(DISTANCE_RAMP, spines.somaDistance[i] / reach)
          : mode === 'section'
            ? vivid(spines.section[i])
            : vivid(i);
    const [r, g, b] = c.map((v) => Math.round(255 * v));
    for (let v = spines.vertexStart[i]; v < spines.vertexStart[i + 1]; v++) {
      out[3 * v] = r;
      out[3 * v + 1] = g;
      out[3 * v + 2] = b;
    }
  }
}

/** The skeleton's vertices coloured by their SWC type, into `out`: three bytes a vertex. */
export function paintSkeleton(out: Uint8Array, types: Uint8Array): void {
  const byType = new Map<number, number[]>();
  for (let v = 0; v < types.length; v++) {
    let c = byType.get(types[v]);
    if (!c) {
      c = linearOf(TYPE_COLOURS[types[v]] ?? OTHER_TYPE).map((x) => Math.round(255 * x));
      byType.set(types[v], c);
    }
    out[3 * v] = c[0];
    out[3 * v + 1] = c[1];
    out[3 * v + 2] = c[2];
  }
}
