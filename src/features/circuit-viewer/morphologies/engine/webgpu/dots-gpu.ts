import {
  attribute,
  cameraProjectionMatrix,
  Discard,
  Fn,
  If,
  modelViewMatrix,
  positionGeometry,
  varying,
  viewport,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { typed } from './cells-wgsl';

import type { DotUniforms, GpuUniforms } from './gpu-uniforms';

/** The ring's width, in CSS pixels, outside the disc: as `electrodes.ts` has it. */
const RING_PX = 1;

/** A dot's corner, as `electrodes.ts` places it, and in w how far in its ring starts, of the whole. */
const dotCorner = wgslFn(/* wgsl */ `
fn dotCorner(contact: vec3f, look: vec4f, corner: vec2f, modelView: mat4x4f, projection: mat4x4f, vp: vec4f,
             radius: f32, minRadius: f32, ring: f32, lift: f32) -> vec4f {
  let c = (modelView * vec4f(contact, 1.0)).xyz;
  let span = 2.0 / (projection[1][1] * vp.w);
  let um = select(span * max(-c.z, 1e-3), span, projection[3][3] > 0.5);
  let r = max(radius * look.a, minRadius * um);
  let outer = r + ring * um;
  return projection * vec4f(c.xy + corner * outer, c.z + lift * r, 1.0);
}`);

const dotInner = wgslFn(/* wgsl */ `
fn dotInner(contact: vec3f, look: vec4f, modelView: mat4x4f, projection: mat4x4f, vp: vec4f, radius: f32,
            minRadius: f32, ring: f32) -> f32 {
  let c = (modelView * vec4f(contact, 1.0)).xyz;
  let span = 2.0 / (projection[1][1] * vp.w);
  let um = select(span * max(-c.z, 1e-3), span, projection[3][3] > 0.5);
  let r = max(radius * look.a, minRadius * um);
  return r / (r + ring * um);
}`);

const dotColour = wgslFn(/* wgsl */ `
fn dotColour(corner: vec2f, inner: f32, colour: vec3f, ringColour: vec3f) -> vec4f {
  return vec4f(select(colour, ringColour, length(corner) > inner), 1.0);
}`);

/**
 * Dots of `electrodes.ts` on WebGPU, their colours written as they came, in sRGB: in front of the cells, with a ring a
 * CSS pixel wide on a screen of `pixelRatio`; or `among` them, with no ring, hidden by what is nearer the eye and
 * brought towards it by their radius.
 */
function dotMaterial(
  u: GpuUniforms,
  dots: DotUniforms,
  pixelRatio: number,
  among = false
): THREE.MeshBasicNodeMaterial {
  const contact = attribute('aContact', 'vec3');
  const look = attribute('aLook', 'vec4');
  const sizes = {
    contact,
    look,
    modelView: modelViewMatrix,
    projection: cameraProjectionMatrix,
    vp: viewport,
    radius: dots.radius,
    minRadius: dots.minRadius,
    ring: among ? 0 : RING_PX * pixelRatio,
  };
  const corner = varying(positionGeometry.xy);
  const material = new THREE.MeshBasicNodeMaterial();
  material.vertexNode = dotCorner({ ...sizes, corner: positionGeometry.xy, lift: among ? 1 : 0 });
  const colour = typed<'vec4'>(
    dotColour({
      corner,
      inner: varying(typed<'float'>(dotInner(sizes))),
      colour: varying(look.xyz),
      ringColour: u.ringColour,
    })
  );
  material.fragmentNode = Fn(() => {
    If(corner.length().greaterThan(1), () => {
      Discard();
    });
    return colour;
  })();
  material.depthTest = among;
  material.depthWrite = false;
  return material;
}

/** The electrodes', synapses' and markers' materials on WebGPU. */
export function dotMaterials(u: GpuUniforms, pixelRatio: number) {
  return {
    electrode: dotMaterial(u, u.electrodes, pixelRatio),
    synapse: dotMaterial(u, u.synapses, pixelRatio, true),
    marker: dotMaterial(u, u.markers, pixelRatio),
  };
}
