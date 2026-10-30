import {
  attribute,
  cameraProjectionMatrix,
  modelViewMatrix,
  positionGeometry,
  sqrt,
  varying,
  vec3,
  vec4,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { GLOW_RIM_COLOR } from '../impostors';
import { BLUE_RAMP, GLOW_SWELL, LIGHT } from '../soma-cloud';
import {
  CELLS,
  cellGlow,
  cellId,
  cellXY,
  flat,
  keptUnless,
  srgbWGSL,
  typed,
  VIEW,
} from './cells-wgsl';
import { surfaceOf } from './occlusion-gpu';

import type { Node } from 'three/webgpu';
import type { GpuUniforms } from './gpu-uniforms';

/** Where a soma's cell and centre are read from: its instance's attributes, or a culling's lists. */
export interface SomaSource {
  cell: Node<'uint'>;
  centre: Node<'vec3'>;
}

/**
 * The pyramid's corner, as `soma-cloud.ts` places it; a cell not drawn has its corners at one point outside the view.
 */
const cloudCorner = wgslFn(
  /* wgsl */ `
fn cloudCorner(centre: vec3f, corner: vec3f, offset: vec3f, radius: f32, modelView: mat4x4f, projection: mat4x4f,
               texel: vec4f, swell: f32) -> vec4f {
  if (texel.a == 0.0) { return vec4f(2.0, 2.0, 2.0, 1.0); }
  let c = modelView * vec4f(centre - offset, 1.0);
  let r = radius * (1.0 + ${GLOW_SWELL.toFixed(6)} * swell);
  return projection * vec4f(lifted(vec3f(c.xy + corner.xy * r, c.z), corner.z * r, projection), 1.0);
}`,
  [VIEW]
);

/** The cell's colour in sRGB and its glow, as `soma-cloud.ts` takes them. */
const cloudLook = wgslFn(
  /* wgsl */ `
fn cloudLook(cell: u32, highlighted: u32, texel: vec4f, glow: f32, shade: vec4f, highlight: vec3f) -> vec4f {
  var colour = toSRGB(texel.rgb);
  if (cell == highlighted) {
    colour = toSRGB(highlight);
  } else if (shade.g < 0.5) {
    // Crowding darkens the cell by up to 55%; a cell with no colour of its own takes its colour from the blue ramp.
    colour = colour * (1.0 - 0.55 * shade.r);
  } else if (shade.r < 0.5) {
    colour = mix(${srgbWGSL(BLUE_RAMP[0])}, ${srgbWGSL(BLUE_RAMP[1])}, 2.0 * shade.r);
  } else {
    colour = mix(${srgbWGSL(BLUE_RAMP[1])}, ${srgbWGSL(BLUE_RAMP[2])}, 2.0 * shade.r - 1.0);
  }
  return vec4f(glowing(colour, glow), glow);
}`,
  [CELLS]
);

const cloudAlpha = wgslFn(/* wgsl */ `
fn cloudAlpha(cell: u32, highlighted: u32, glow: f32, opacity: f32) -> f32 {
  return select(mix(opacity, 1.0, glow), 1.0, cell == highlighted);
}`);

const cloudColour = wgslFn(/* wgsl */ `
fn cloudColour(coord: vec2f, look: vec4f, alpha: f32, rimOn: f32) -> vec4f {
  let z2 = 1.0 - dot(coord, coord);
  let facing = 0.5 * (1.0 + dot(vec3f(coord, sqrt(max(z2, 0.0))), vec3f(${LIGHT.map((v) => v.toFixed(6)).join(', ')})));
  let shaded = look.rgb * (0.5 + 0.5 * smoothstep(0.0, 1.0, facing)) + 0.33 * pow(facing, 50.0);
  // A glowing soma gives light of its own, and gets a ring at its edge where the morphologies have one.
  let hot = shaded + 0.2 * look.a * look.rgb;
  let rim = look.a * rimOn * smoothstep(0.9, 1.0, length(coord));
  return vec4f(mix(hot, ${srgbWGSL(GLOW_RIM_COLOR)}, rim), alpha);
}`);

/** The corner on the unit disc, interpolated straight across the screen, as `discCoord` in `soma-cloud.ts` has it. */
export const DISC_COORD = varying(positionGeometry.xy).setInterpolation('linear');

/**
 * The somas of `soma-cloud.ts` on WebGPU. The cloud material draws one pyramid per cell at its position, shaded as a
 * sphere and drawn as it comes out, as on WebGL 2, and writes the sphere's surface for the occlusion (`surfaceOf`). The
 * id material draws the same pyramids in their cells' numbers. Both read each soma's cell and centre from where they
 * are given (`SomaSource`).
 */
export function somaCloudMaterials(
  u: GpuUniforms,
  { cell, centre }: SomaSource = {
    cell: attribute('aCell', 'uint'),
    centre: attribute('aPosition', 'vec3'),
  }
): {
  cloud: THREE.MeshBasicNodeMaterial;
  id: THREE.MeshBasicNodeMaterial;
} {
  const xy = cellXY({ cell });
  const texel = u.cells.load(xy);
  const glow = typed<'float'>(
    cellGlow({ cell, highlighted: u.highlighted, glowTexel: u.glow.load(xy) })
  );
  const place = {
    centre,
    corner: positionGeometry,
    offset: u.offset,
    radius: u.radius,
    modelView: modelViewMatrix,
    projection: cameraProjectionMatrix,
    texel,
  };
  const coord = DISC_COORD;
  const outside = coord.dot(coord).greaterThan(1);

  const cloud = new THREE.MeshBasicNodeMaterial();
  cloud.vertexNode = cloudCorner({ ...place, swell: glow });
  const centreZ = flat(modelViewMatrix.mul(vec4(place.centre.sub(u.offset), 1)).z);
  const radius = flat(u.radius.mul(glow.mul(GLOW_SWELL).add(1)));
  const facing = sqrt(coord.dot(coord).oneMinus().max(0));
  const look = cloudLook({
    cell,
    highlighted: u.highlighted,
    texel,
    glow,
    shade: u.shade.load(xy),
    highlight: u.highlight,
  });
  const alpha = cloudAlpha({ cell, highlighted: u.highlighted, glow, opacity: u.opacity });
  // Not a fragment node: a fragment node would write nothing to the occlusion's surface (`Occlusion`).
  cloud.maskNode = outside.not();
  cloud.outputNode = typed<'vec4'>(
    cloudColour({
      coord,
      look: flat(typed<'vec4'>(look)),
      alpha: flat(typed<'float'>(alpha)),
      rimOn: u.glowRim.w,
    })
  );
  cloud.mrtNode = surfaceOf(vec3(coord, facing), centreZ.add(radius.mul(facing)), flat(glow));

  const id = new THREE.MeshBasicNodeMaterial();
  id.vertexNode = cloudCorner({ ...place, swell: 0 });
  id.fragmentNode = keptUnless(outside, flat(typed<'vec4'>(cellId({ cell }))));
  id.blending = THREE.NoBlending;
  return { cloud, id };
}
