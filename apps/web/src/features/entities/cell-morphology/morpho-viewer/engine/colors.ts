import * as THREE from 'three';

import { SWC_APICAL, SWC_AXON, SWC_BASAL, SWC_SOMA } from './swc';

/** CSS colours of the neurite types. */
export interface Palette {
  soma: string;
  axon: string;
  basalDendrite: string;
  apicalDendrite: string;
}

/** Path distances to the soma, µm, for colouring by distance. */
export interface DistanceData {
  /** The farthest distance: the end of the ramp. */
  max: number;
  /**
   * Those of a layer, by the very object the viewer was given (a mesh, or a skeleton), once measured: per vertex of a
   * mesh, per segment of a skeleton.
   */
  of(layer: object): Float32Array | undefined;
}

/** The SWC types the platform names, and their colour in a palette. */
export const PALETTE_KEYS: Record<number, keyof Palette> = {
  [SWC_SOMA]: 'soma',
  [SWC_AXON]: 'axon',
  [SWC_BASAL]: 'basalDendrite',
  [SWC_APICAL]: 'apicalDendrite',
};

/** SWC types past the four the platform names. */
const OTHER_TYPES = ['#2a9d8f', '#e9a13b', '#5c6b73', '#b5179e'];

/** From the soma to the farthest point: morphoviewer's ramp, which the platform's key shows. */
export const DISTANCE_RAMP = ['#0f0', '#ff0', '#f00'];

/** Odd, so that each of the ramp's stops has an entry of its own. */
const RAMP_STEPS = 257;

/** Linear RGB of every SWC type, three floats per type, as glTF vertex colours take them. */
export function typeRgb(palette: Palette): Float32Array {
  const rgb = new Float32Array(256 * 3);
  const color = new THREE.Color();
  for (let t = 0; t < 256; t++) {
    const key = PALETTE_KEYS[t];
    color.set(key ? palette[key] : OTHER_TYPES[t % OTHER_TYPES.length]).toArray(rgb, 3 * t);
  }
  return rgb;
}

/** Linear RGB bytes of every SWC type, three per type, as the 8-bit colour attributes take them. */
export function typeBytes(palette: Palette): Uint8Array {
  return Uint8Array.from(typeRgb(palette), (v) => Math.round(v * 255));
}

/** The distance ramp in `RAMP_STEPS` linear RGB bytes, blended in sRGB as a canvas gradient is. */
const RAMP_BYTES = (() => {
  const stops = DISTANCE_RAMP.map((c) => new THREE.Color(c).convertLinearToSRGB());
  const bytes = new Uint8Array(RAMP_STEPS * 3);
  const color = new THREE.Color();
  for (let i = 0; i < RAMP_STEPS; i++) {
    const x = (i / (RAMP_STEPS - 1)) * (stops.length - 1);
    const k = Math.min(Math.floor(x), stops.length - 2);
    color.lerpColors(stops[k], stops[k + 1], x - k).convertSRGBToLinear();
    bytes[3 * i] = Math.round(color.r * 255);
    bytes[3 * i + 1] = Math.round(color.g * 255);
    bytes[3 * i + 2] = Math.round(color.b * 255);
  }
  return bytes;
})();

/**
 * Colour `types.length` items into `target`, three bytes each: by type from `table` (`typeBytes`), or, given their
 * `distances`, along the ramp from 0 to `max`.
 */
export function paintColors(
  target: Uint8Array,
  types: ArrayLike<number>,
  table: Uint8Array,
  distances?: Float32Array,
  max = 0
): void {
  const n = types.length;
  if (distances && distances.length === n && max > 0) {
    const scale = (RAMP_STEPS - 1) / max;
    for (let i = 0; i < n; i++) {
      const c = 3 * Math.min(RAMP_STEPS - 1, Math.max(0, Math.round(distances[i] * scale)));
      target[3 * i] = RAMP_BYTES[c];
      target[3 * i + 1] = RAMP_BYTES[c + 1];
      target[3 * i + 2] = RAMP_BYTES[c + 2];
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const c = 3 * types[i];
    target[3 * i] = table[c];
    target[3 * i + 1] = table[c + 1];
    target[3 * i + 2] = table[c + 2];
  }
}
