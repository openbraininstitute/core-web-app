import {
  attribute,
  cameraProjectionMatrix,
  Discard,
  Fn,
  If,
  instanceIndex,
  modelViewMatrix,
  positionGeometry,
  varying,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { GLOW_RIM_COLOR } from '../impostors';
import { GLOW_SWELL } from '../soma-cloud';
import { CELLS, flat, NOWHERE, srgbWGSL, typed } from './cells-wgsl';

import type { GpuUniforms } from './gpu-uniforms';

const LIGHT = new THREE.Vector3(-0.4, 0.5, 0.666).normalize().toArray();

/** How much a soma glows, none for the highlighted cell, which keeps the highlight. */
const GLOW = /* wgsl */ `
fn cloudGlow(cell: u32, highlighted: u32, glowTexel: vec4f) -> f32 {
  return select(glowTexel.r, 0.0, cell == highlighted);
}`;

/** The quad's corner, as `soma-cloud.ts` places it; a cell not drawn has its corners nowhere. */
const cloudCorner = wgslFn(
  /* wgsl */ `
fn cloudCorner(centre: vec3f, corner: vec2f, offset: vec3f, radius: f32, modelView: mat4x4f, projection: mat4x4f,
               texel: vec4f, swell: f32) -> vec4f {
  if (texel.a == 0.0) { return ${NOWHERE}; }
  let c = modelView * vec4f(centre - offset, 1.0);
  return projection * vec4f(c.xy + corner * radius * (1.0 + ${GLOW_SWELL.toFixed(6)} * swell), c.z, 1.0);
}`
);

const cloudGlow = wgslFn(GLOW);

/** The cell's colour in sRGB and its glow, as `soma-cloud.ts` takes them. */
const cloudLook = wgslFn(
  /* wgsl */ `
fn cloudLook(cell: u32, highlighted: u32, texel: vec4f, glow: f32, shade: vec4f, highlight: vec3f) -> vec4f {
  var colour = toSRGB(texel.rgb);
  if (cell == highlighted) {
    colour = toSRGB(highlight);
  } else if (shade.g < 0.5) {
    // How crowded the cell is darkens it by up to 55%; with no colour of its own it runs along the blue ramp.
    colour = colour * (1.0 - 0.55 * shade.r);
  } else if (shade.r < 0.5) {
    colour = mix(${srgbWGSL('hsl(200, 100%, 80%)')}, ${srgbWGSL('hsl(200, 100%, 50%)')}, 2.0 * shade.r);
  } else {
    colour = mix(${srgbWGSL('hsl(200, 100%, 50%)')}, ${srgbWGSL('hsl(220, 100%, 30%)')}, 2.0 * shade.r - 1.0);
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
  // Light of its own while it glows, and a ring at its edge where the morphologies have one.
  let hot = shaded + 0.2 * look.a * look.rgb;
  let rim = look.a * rimOn * smoothstep(0.9, 1.0, length(coord));
  return vec4f(mix(hot, ${srgbWGSL(GLOW_RIM_COLOR)}, rim), alpha);
}`);

const cellIdOf = wgslFn(
  /* wgsl */ `
fn cellIdOf(cell: u32) -> vec4f {
  return cellId(cell);
}`,
  [CELLS]
);

const xyOf = wgslFn(
  /* wgsl */ `
fn xyOf(cell: u32) -> vec2i {
  return cellXY(cell);
}`,
  [CELLS]
);

/** Outside the quad's circle, nothing; inside, `colour`. */
const inCircle = (coord: THREE.Node<'vec2'>, colour: THREE.Node<'vec4'>) =>
  Fn(() => {
    If(coord.dot(coord).greaterThan(1), () => {
      Discard();
    });
    return colour;
  })();

/**
 * The somas of `soma-cloud.ts` on WebGPU: a quad a cell at its position, shaded as a sphere and drawn as it comes out,
 * as on WebGL 2; and the same quads in their cells' numbers.
 */
export function somaCloudMaterials(u: GpuUniforms): {
  cloud: THREE.MeshBasicNodeMaterial;
  id: THREE.MeshBasicNodeMaterial;
} {
  const cell = instanceIndex;
  const xy = xyOf({ cell });
  const texel = u.cells.load(xy);
  const glow = typed<'float'>(
    cloudGlow({ cell, highlighted: u.highlighted, glowTexel: u.glow.load(xy) })
  );
  const place = {
    centre: attribute('aPosition', 'vec3'),
    corner: positionGeometry.xy,
    offset: u.offset,
    radius: u.radius,
    modelView: modelViewMatrix,
    projection: cameraProjectionMatrix,
    texel,
  };
  const coord = varying(positionGeometry.xy);

  const cloud = new THREE.MeshBasicNodeMaterial();
  cloud.vertexNode = cloudCorner({ ...place, swell: glow });
  const look = cloudLook({
    cell,
    highlighted: u.highlighted,
    texel,
    glow,
    shade: u.shade.load(xy),
    highlight: u.highlight,
  });
  const alpha = cloudAlpha({ cell, highlighted: u.highlighted, glow, opacity: u.opacity });
  cloud.fragmentNode = inCircle(
    coord,
    typed<'vec4'>(
      cloudColour({
        coord,
        look: flat(typed<'vec4'>(look)),
        alpha: flat(typed<'float'>(alpha)),
        rimOn: u.glowRim.w,
      })
    )
  );

  const id = new THREE.MeshBasicNodeMaterial();
  id.vertexNode = cloudCorner({ ...place, swell: 0 });
  id.fragmentNode = inCircle(coord, flat(typed<'vec4'>(cellIdOf({ cell }))));
  id.blending = THREE.NoBlending;
  return { cloud, id };
}
