import type { LfpField } from '@/features/lfp-viewer/summary';

/** Negative, a sink, in blue; positive, a source, in orange; near zero, pale grey. */
const STOPS = ['#08306b', '#2171b5', '#9ecae1', '#f2f2f2', '#fdae6b', '#e6550d', '#7f2704'];
/** Below this |V| the scale is close to linear; above it, logarithmic. */
const CORE_UV = 10;
/** Colours the contacts of the 3D scene are binned into: odd, so zero has its own. */
export const SCENE_LEVELS = 17;

export type ColourScale = {
  /** |V| at either end of the scale, in µV. */
  limit: number;
  /** Where a value falls, from −1 to 1. */
  position: (uv: number) => number;
};

export function colourScale(limit: number): ColourScale {
  const top = Math.asinh(limit / CORE_UV) || 1;
  return {
    limit,
    position: (uv) => Math.max(-1, Math.min(1, Math.asinh(uv / CORE_UV) / top)),
  };
}

/** The 99.9th percentile of |V| over a field, sampled where it is large. */
export function fieldLimit(field: LfpField): number {
  const { data, scale } = field;
  // Odd: min/max data alternates lows and highs, and an even stride would read one of them only.
  const stride = Math.max(1, Math.floor(data.length / 200_000)) | 1;
  const sample = new Float32Array(Math.ceil(data.length / stride));
  for (let i = 0, j = 0; i < data.length; i += stride, j++) sample[j] = Math.abs(data[i]);
  sample.sort();
  return sample[Math.floor((sample.length - 1) * 0.999)] * scale || 1;
}

export function formatUv(uv: number): string {
  return uv >= 10 ? uv.toFixed(0) : uv.toPrecision(2);
}

/** A position on the scale's colour, as RGB. */
function rgbAt(position: number): [number, number, number] {
  const at = ((position + 1) / 2) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.max(0, Math.floor(at)));
  const f = Math.min(1, Math.max(0, at - i));
  const a = Number.parseInt(STOPS[i].slice(1), 16);
  const b = Number.parseInt(STOPS[i + 1].slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - f) + ((b >> shift) & 255) * f);
  return [channel(16), channel(8), channel(0)];
}

/** 256 colours along the scale, for a canvas: packed RGBA, little-endian. */
export const COLOUR_TABLE = Uint32Array.from({ length: 256 }, (_, i) => {
  const [r, g, b] = rgbAt((i / 255) * 2 - 1);
  return (255 << 24) | (b << 16) | (g << 8) | r;
});

/** The scale's CSS gradient, for its legend. */
export const SCALE_GRADIENT = `linear-gradient(to right, ${STOPS.join(', ')})`;

export function hexAt(position: number): string {
  return `#${rgbAt(position)
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The scene level a position is binned into. */
export function levelOf(position: number): number {
  return Math.round(((position + 1) / 2) * (SCENE_LEVELS - 1));
}
