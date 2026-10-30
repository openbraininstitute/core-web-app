import chroma from 'chroma-js';
import { Discard, element, Fn, If, uint, varying, wgsl, wgslFn } from 'three/tsl';

import { ROW_BITS } from '../cell-table';

import type { ArrayNode, Node } from 'three/webgpu';

/** A node made by a WGSL function, cast to the type that function returns. */
export const typed = <T extends string>(node: Node) => node as unknown as Node<T>;

/** `node` handed to the fragments as the first vertex of a triangle has it. */
export const flat = <T extends string>(node: Node<T>) =>
  varying(node).setInterpolation('flat', 'either');

/** Column `k` of the matrix that a WGSL function returns its results in. */
export const col = (m: Node<'mat4'>, k: number) =>
  typed<'vec4'>(element(m as unknown as ArrayNode<'vec4'>, uint(k)));

/** Nothing where `off`; `colour` elsewhere. */
export const keptUnless = (off: Node<'bool'>, colour: Node<'vec4'>) =>
  Fn(() => {
    If(off, () => {
      Discard();
    });
    return colour;
  })();

/** A colour as WGSL takes it, its channels from 0 to 1 in sRGB. */
export const srgbWGSL = (color: string) =>
  `vec3f(${chroma(color)
    .gl()
    .slice(0, 3)
    .map((v) => v.toFixed(6))
    .join(', ')})`;

/** The view's measure of a pixel and `lifted`: as `PIXEL_UM` and `LIFTED` in `impostors.ts`. */
export const VIEW_WGSL = /* wgsl */ `
fn isOrthographic(projection: mat4x4f) -> bool {
  return projection[3][3] > 0.5;
}
// Brings the view point p nearer the eye by lift without moving it on screen: by at most half its depth, and never
// past the near plane, which is at depth 0 here.
fn lifted(p: vec3f, lift: f32, projection: mat4x4f) -> vec3f {
  if (isOrthographic(projection)) { return vec3f(p.xy, p.z + lift); }
  let near = projection[3][2] / projection[2][2];
  let z = max(p.z, min(p.z + lift, min(0.5 * p.z, -1.01 * near)));
  return vec3f(p.xy * (z / p.z), z);
}
// The µm a device pixel spans at the view depth z.
fn pixelUm(z: f32, projection: mat4x4f, vp: vec4f) -> f32 {
  let span = 2.0 / (projection[1][1] * vp.w);
  return select(span * max(-z, 1e-3), span, isOrthographic(projection));
}
`;
export const VIEW = wgsl(VIEW_WGSL);

/** The functions that WGSL colouring cells calls, as `CELL_GLSL` in `impostors.ts`. */
export const CELLS = wgsl(/* wgsl */ `
// Brightens the colour and takes it a third of the way to a warm white, in sRGB, as the somas view lights a spiking
// soma.
fn glowing(colour: vec3f, glow: f32) -> vec3f {
  let hot = mix(min(colour * 2.2, vec3f(1.0)), vec3f(1.0, 0.97, 0.88), 0.35);
  return mix(colour, hot, glow);
}
fn toSRGB(linear: vec3f) -> vec3f {
  return select(linear * 12.92, 1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055, linear >= vec3f(0.0031308));
}
`);

/** A cell's texel in the cell table. */
export const CELL_XY_WGSL = /* wgsl */ `
fn cellXY(cell: u32) -> vec2i {
  return vec2i(i32(cell & ${(1 << ROW_BITS) - 1}u), i32(cell >> ${ROW_BITS}u));
}`;
export const cellXY = wgslFn(CELL_XY_WGSL);

/** The cell's number plus one, a byte per channel, so that a pixel of zeros belongs to no cell. */
export const cellId = wgslFn(/* wgsl */ `
fn cellId(cell: u32) -> vec4f {
  let id = cell + 1u;
  return vec4f(f32(id & 255u), f32((id >> 8u) & 255u), f32((id >> 16u) & 255u), f32(id >> 24u)) / 255.0;
}`);

/** How much a cell glows, none for the highlighted one, which keeps the highlight. */
export const cellGlow = wgslFn(/* wgsl */ `
fn cellGlow(cell: u32, highlighted: u32, glowTexel: vec4f) -> f32 {
  return select(glowTexel.r, 0.0, cell == highlighted);
}`);
