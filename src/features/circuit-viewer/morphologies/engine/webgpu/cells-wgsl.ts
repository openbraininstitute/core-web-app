import chroma from 'chroma-js';
import { varying, wgsl } from 'three/tsl';

import { ROW_BITS } from '../cell-table';

import type { Node } from 'three/webgpu';

/** A node of WGSL's making, of the type its function returns. */
export const typed = <T extends string>(node: Node) => node as unknown as Node<T>;

/** `node` handed to the fragments as the first vertex of a triangle has it. */
export const flat = <T extends string>(node: Node<T>) =>
  varying(node).setInterpolation('flat', 'either');

/** A colour as WGSL takes it, its channels from 0 to 1 in sRGB. */
export const srgbWGSL = (color: string) =>
  `vec3f(${chroma(color)
    .gl()
    .slice(0, 3)
    .map((v) => v.toFixed(6))
    .join(', ')})`;

/** What every WGSL that draws cells needs of them: as `CELL_GLSL` in `impostors.ts`. */
export const CELLS = wgsl(/* wgsl */ `
fn cellXY(cell: u32) -> vec2i {
  return vec2i(i32(cell & ${(1 << ROW_BITS) - 1}u), i32(cell >> ${ROW_BITS}u));
}
// A cell's number and one, a byte a channel, so that a pixel of zeros is no cell's.
fn cellId(cell: u32) -> vec4f {
  let id = cell + 1u;
  return vec4f(f32(id & 255u), f32((id >> 8u) & 255u), f32((id >> 16u) & 255u), f32(id >> 24u)) / 255.0;
}
// Brightened and taken a third of the way to a warm white, in sRGB, as the somas view lights a spiking soma.
fn glowing(colour: vec3f, glow: f32) -> vec3f {
  let hot = mix(min(colour * 2.2, vec3f(1.0)), vec3f(1.0, 0.97, 0.88), 0.35);
  return mix(colour, hot, glow);
}
fn toSRGB(linear: vec3f) -> vec3f {
  return select(linear * 12.92, 1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055, linear >= vec3f(0.0031308));
}
`);

/** Where the corners of a cell that is not drawn go: one point outside the view. */
export const NOWHERE = 'vec4f(2.0, 2.0, 2.0, 1.0)';
