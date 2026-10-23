import {
  attribute,
  cameraProjectionMatrix,
  modelViewMatrix,
  positionGeometry,
  varying,
  viewport,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { RING_PX } from '../electrodes';
import { col, typed, VIEW } from './cells-wgsl';

import type { DotUniforms, GpuUniforms } from './gpu-uniforms';

/**
 * A dot's corner in clip space, as `electrodes.ts` places it; and in the second column, where its ring starts, a share
 * of the whole.
 */
const dotQuad = wgslFn(
  /* wgsl */ `
fn dotQuad(contact: vec3f, look: vec4f, corner: vec2f, modelView: mat4x4f, projection: mat4x4f, vp: vec4f,
           radius: f32, minRadius: f32, ring: f32, lift: f32, scale: f32) -> mat4x4f {
  let c = (modelView * vec4f(contact, 1.0)).xyz;
  let um = pixelUm(c.z, projection, vp) * scale;
  let r = max(radius * look.a, minRadius * um);
  let outer = r + ring * um;
  return mat4x4f(projection * vec4f(c.xy + corner * outer, c.z + lift * r, 1.0), vec4f(r / outer, 0.0, 0.0, 0.0),
                 vec4f(0.0), vec4f(0.0));
}`,
  [VIEW]
);

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
  const look = attribute('aLook', 'vec4');
  const quad = typed<'mat4'>(
    dotQuad({
      contact: attribute('aContact', 'vec3'),
      look,
      corner: positionGeometry.xy,
      modelView: modelViewMatrix,
      projection: cameraProjectionMatrix,
      vp: viewport,
      radius: dots.radius,
      minRadius: dots.minRadius,
      ring: among ? 0 : RING_PX * pixelRatio,
      lift: among ? 1 : 0,
      scale: u.dotScale,
    })
  ).toVar();
  const corner = varying(positionGeometry.xy);
  const material = new THREE.MeshBasicNodeMaterial();
  material.vertexNode = col(quad, 0);
  // Not a fragment node, which would write nothing of the occlusion's surface (`Occlusion`).
  material.colorNode = typed<'vec4'>(
    dotColour({
      corner,
      inner: varying(col(quad, 1).x),
      colour: varying(look.xyz),
      ringColour: u.ringColour,
    })
  );
  material.maskNode = corner.length().lessThanEqual(1);
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
