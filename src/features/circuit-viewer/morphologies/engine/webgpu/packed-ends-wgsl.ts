import { SCALE_AT, STEP_NEXT, STEP_TOP } from '../../load/packed-ends';

/**
 * Unpack a segment's ends from the arena's words (`packed-ends.ts`), each as x, y and z in µm and its radius.
 * `packing`: the pack's grid, µm, and one over its radius steps to a doubling.
 */
export const PACKED_RADIUS_WGSL = /* wgsl */ `
fn packedRadius(byte: u32, perStep: f32) -> f32 {
  return exp2(f32(bitcast<i32>(byte << 24u) >> 24u) * perStep);
}`;
export const PACKED_NEAR_WGSL = /* wgsl */ `
fn packedNear(x: u32, y: u32, z: u32, e: u32, packing: vec2f) -> vec4f {
  return vec4f(bitcast<f32>(x), bitcast<f32>(y), bitcast<f32>(z), packedRadius(e >> 16u, packing.y));
}`;
export const PACKED_FAR_WGSL = /* wgsl */ `
fn packedFar(a: vec4f, d: u32, e: u32, packing: vec2f) -> vec4f {
  let steps = vec3i(bitcast<i32>(d << ${STEP_TOP}u) >> ${STEP_TOP}u, bitcast<i32>(d << ${STEP_NEXT}u) >> ${STEP_TOP}u,
                    bitcast<i32>(e << ${STEP_TOP}u) >> ${STEP_TOP}u);
  let unit = packing.x * f32(1u << (2u * (d >> ${SCALE_AT}u)));
  return vec4f(a.xyz + vec3f(steps) * unit, packedRadius(e >> 24u, packing.y));
}`;
