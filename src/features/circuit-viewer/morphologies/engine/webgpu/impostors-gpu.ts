import {
  attribute,
  cameraNear,
  cameraProjectionMatrix,
  cameraViewMatrix,
  cameraWorldMatrix,
  float,
  instanceIndex,
  mix,
  output,
  positionGeometry,
  screenCoordinate,
  sRGBTransferOETF,
  toneMapping,
  uint,
  varying,
  vec4,
  viewport,
  wgsl,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { EXPOSURE } from '@/features/viewer-3d/engine/looks';

import { BY_SECTION } from '../cell-table';
import { CELL_MASK, HOLE, MIN_RADIUS, TYPE_SHIFT } from '../impostors';
import { CELLS, cellGlow, cellId, cellXY, col, flat, keptUnless, typed, VIEW } from './cells-wgsl';

import type { Node } from 'three/webgpu';
import type { Look } from '@/features/viewer-3d/engine/looks';
import type { GpuUniforms } from './gpu-uniforms';

/**
 * As `impostors.ts` draws a segment and a soma, in WGSL. Pixels: the fragment's position counts them from the top left
 * of the target, y down, where WebGL's counts y up; geometry is worked in pixels y up, as view space has it, and the
 * ends handed to the fragments are turned over.
 */
const IMPOSTORS = wgsl(
  /* wgsl */ `
// A view point in device pixels from the viewport's bottom left, y up.
fn pixelsUp(p: vec3f, projection: mat4x4f, vp: vec4f) -> vec2f {
  let clip = projection * vec4f(p, 1.0);
  return (clip.xy / clip.w * 0.5 + 0.5) * vp.zw;
}
// Pixels y up as the fragment's position counts them.
fn toFragment(q: vec2f, vp: vec4f) -> vec2f {
  return vec2f(vp.x + q.x, vp.y + vp.w - q.y);
}
// The view point p brought nearer the eye by lift, where it stays on screen: by half its depth at most.
fn lifted(p: vec3f, lift: f32, orthographic: bool) -> vec3f {
  if (orthographic) { return vec3f(p.xy, p.z + lift); }
  let z = p.z + min(lift, -0.5 * p.z);
  return vec3f(p.xy * (z / p.z), z);
}
// A cell in its sections' colours is all but opaque in the cell table.
fn ownColour(texel: vec4f, type_: u32, unknown: vec3f, soma: vec3f, axon: vec3f, basal: vec3f, apical: vec3f) -> vec3f {
  if (texel.a > ${(BY_SECTION + 0.5) / 255}) { return texel.rgb; }
  switch type_ {
    case 1u: { return soma; }
    case 2u: { return axon; }
    case 3u: { return basal; }
    case 4u: { return apical; }
    default: { return unknown; }
  }
}
`,
  [VIEW]
);

/**
 * A segment's quad: the corner in the world, w 1 where it is drawn; its ends in the fragment's pixels; its radii in
 * pixels. corner.x picks the end, corner.y the side. Not drawn, its four corners are one point.
 */
const segmentQuad = wgslFn(
  /* wgsl */ `
fn segmentQuad(corner: vec3f, word: u32, shown: f32, least: f32, endA: vec4f, endB: vec4f, chartA: vec4f,
               chartB: vec4f, morph: f32, shift: vec3f, view: mat4x4f, world: mat4x4f, projection: mat4x4f,
               vp: vec4f, near: f32) -> mat4x4f {
  let none = mat4x4f(vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
  if (shown < 0.5 || (word >> ${TYPE_SHIFT}u) == ${HOLE}u) { return none; }
  let A = mix(endA, chartA, morph);
  let B = mix(endB, chartB, morph);
  var a = (view * vec4f(A.xyz + shift, 1.0)).xyz;
  var b = (view * vec4f(B.xyz + shift, 1.0)).xyz;
  var ra = A.w;
  var rb = B.w;
  let orthographic = isOrthographic(projection);
  if (!orthographic) {
    // Cut at twice the near plane's depth: nearer the eye an end has no place on screen, and up to there the lifted
    // quad stays behind the near plane.
    let cut = -2.0 * near;
    if (min(a.z, b.z) > cut) { return none; }
    if (a.z > cut) {
      let t = (cut - b.z) / (a.z - b.z);
      a = mix(b, a, t);
      ra = mix(rb, ra, t);
    } else if (b.z > cut) {
      let t = (cut - a.z) / (b.z - a.z);
      b = mix(a, b, t);
      rb = mix(ra, rb, t);
    }
  }
  let umA = pixelUm(a.z, projection, vp);
  let umB = pixelUm(b.z, projection, vp);
  ra = max(ra, least * umA);
  rb = max(rb, least * umB);
  let pa = pixelsUp(a, projection, vp);
  let pb = pixelsUp(b, projection, vp);
  let radii = vec2f(ra / umA, rb / umB);
  var along = pb - pa;
  let len = length(along);
  along = select(vec2f(1.0, 0.0), along / len, len > 1e-6);
  let across = vec2f(-along.y, along.x);
  let atB = corner.x > 0.0;
  let end = select(a, b, atB);
  // As wide on screen as the wider end all along, and a little more: narrowing with the tube, the quad's side would
  // cut into the wider end.
  let wide = 1.15 * max(radii.x, radii.y) * select(umA, umB, atB);
  let outward = select(-along, along, atB) + across * corner.y;
  let p = lifted(vec3f(end.xy + outward * wide, end.z), select(ra, rb, atB), orthographic);
  return mat4x4f(world * vec4f(p, 1.0), vec4f(toFragment(pa, vp), toFragment(pb, vp)), vec4f(radii, 0.0, 0.0),
                 vec4f(0.0));
}`,
  [IMPOSTORS]
);

/**
 * Under pixel q, the normal of a segment's tube in view space, round across its width and across only, as far from its
 * edge, so that a round end carries on into the next segment without a seam; w 1 where the pixel is on it. And in the
 * second column how far the pixel is from the edge and the radius, in pixels.
 */
const segmentSurface = wgslFn(/* wgsl */ `
fn segmentSurface(q: vec2f, ends: vec4f, radii: vec4f) -> mat4x4f {
  let a = ends.xy;
  let ab = ends.zw - a;
  let l2 = dot(ab, ab);
  let t = select(0.0, clamp(dot(q - a, ab) / l2, 0.0, 1.0), l2 > 0.0);
  let r = mix(radii.x, radii.y, t);
  let on = length(q - a - ab * t) <= r;
  let across = select(vec2f(0.0, 1.0), normalize(vec2f(-ab.y, ab.x)), l2 > 0.0);
  let s = clamp(dot(q - a, across) / max(r, 1e-3), -1.0, 1.0);
  // The fragment's y runs down, view space's up.
  let n = vec3f(across.x * s, -across.y * s, sqrt(max(1.0 - s * s, 0.0)));
  return mat4x4f(vec4f(n, select(0.0, 1.0, on)), vec4f(r * (1.0 - abs(s)), r, 0.0, 0.0), vec4f(0.0), vec4f(0.0));
}`);

/**
 * A soma's quad: the corner in the world, w 1 where it is drawn; the centre in view space and the radius; the radius in
 * pixels and the corner in view space.
 */
const somaQuad = wgslFn(
  /* wgsl */ `
fn somaQuad(corner: vec3f, shown: f32, least: f32, sphere: vec4f, chart: vec4f, morph: f32, shift: vec3f,
            view: mat4x4f, world: mat4x4f, projection: mat4x4f, vp: vec4f) -> mat4x4f {
  let none = mat4x4f(vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
  if (shown < 0.5) { return none; }
  let S = mix(sphere, chart, morph);
  let c = (view * vec4f(S.xyz + shift, 1.0)).xyz;
  let um = pixelUm(c.z, projection, vp);
  let r = max(S.w, 1.5 * least * um);
  // How far from its centre the sphere reaches on screen, in µm at the centre's depth.
  var reach = r;
  if (!isOrthographic(projection)) {
    // From d away, at the angle t off the view's axis, the sphere spans asin(r / d) either way, and reaches
    // r / cos(t + asin(r / d)) outwards. lean / d2 is that cosine: under an eighth the eye is in the sphere, or all
    // but, and it is not drawn.
    let d2 = dot(c, c);
    let lean = -c.z * sqrt(max(d2 - r * r, 0.0)) - length(c.xy) * r;
    if (8.0 * lean < d2) { return none; }
    reach = r * d2 / lean;
  }
  // A little wider than the sphere. Its depth is the fragment's to write.
  let p = vec3f(c.xy + corner.xy * (1.2 * reach), c.z);
  return mat4x4f(world * vec4f(p, 1.0), vec4f(c, r), vec4f(r / um, 0.0, 0.0, 0.0), vec4f(p, 0.0));
}`,
  [VIEW]
);

/**
 * Under the corner's point p, the sphere's normal in view space, w 1 where the pixel is on it; how far the pixel is
 * from its edge and its radius, in pixels, and its depth as the depth buffer takes it.
 */
const somaSurface = wgslFn(
  /* wgsl */ `
fn somaSurface(p: vec3f, sphere: vec4f, radiusPx: f32, projection: mat4x4f) -> mat4x4f {
  let orthographic = isOrthographic(projection);
  let centre = sphere.xyz;
  let ray = select(normalize(p), vec3f(0.0, 0.0, -1.0), orthographic);
  let origin = select(vec3f(0.0), vec3f(p.xy, centre.z + 2.0 * sphere.w), orthographic);
  let oc = origin - centre;
  let b = dot(oc, ray);
  let h = b * b - dot(oc, oc) + sphere.w * sphere.w;
  let at = origin + ray * (-b - sqrt(max(h, 0.0)));
  let clip = projection * vec4f(at, 1.0);
  let n = normalize(at - centre);
  // Seen at an angle off the normal, a point of the sphere is drawn its sine of the radius from the centre.
  let facing = dot(n, -ray);
  let edge = radiusPx * (1.0 - sqrt(max(1.0 - facing * facing, 0.0)));
  return mat4x4f(vec4f(n, select(0.0, 1.0, h >= 0.0)), vec4f(edge, radiusPx, clip.z / clip.w, 0.0), vec4f(0.0),
                 vec4f(0.0));
}`,
  [VIEW]
);

/** The cell's colour, linear, as the look lights it: the highlight, or its own lit by its glow. */
const colourOf = wgslFn(
  /* wgsl */ `
fn colourOf(cell: u32, highlighted: u32, highlight: vec3f, texel: vec4f, type_: u32, glow: f32, unknown: vec3f,
            soma: vec3f, axon: vec3f, basal: vec3f, apical: vec3f) -> vec3f {
  if (cell == highlighted) { return highlight; }
  let own = ownColour(texel, type_, unknown, soma, axon, basal, apical);
  if (glow == 0.0) { return own; }
  return pow(glowing(pow(own, vec3f(1.0 / 2.2)), glow), vec3f(2.2));
}`,
  [IMPOSTORS, CELLS]
);

/**
 * The look's roughness and as much more as the normal turns from a pixel to the next, as three's WebGL lighting has
 * it: there it is the impostor's normal that turns, which spreads the highlight across a thin tube; three's WebGPU
 * lighting would take the flat quad's.
 */
const roughnessOf = wgslFn(/* wgsl */ `
fn roughnessOf(n: vec3f, roughness: f32) -> f32 {
  let turn = max(abs(dpdx(n)), abs(dpdy(n)));
  return min(max(roughness, 0.0525) + max(max(turn.x, turn.y), turn.z), 1.0);
}`);

/** A tenth of the radius in from the edge, a pixel at the least, as the somas view rings a soma. */
const rimOf = wgslFn(/* wgsl */ `
fn rimOf(edge: vec4f, glow: f32, rimOn: f32) -> f32 {
  let width = max(0.1 * edge.y, 1.0);
  return glow * rimOn * (1.0 - smoothstep(width - 0.5, width + 0.5, edge.x));
}`);

type Kind = 'segment' | 'soma';

/**
 * What every material of a kind shares: the cell, its texel and its glow where `glowing`, where its quad's corner is,
 * what the fragments take of it, and whether a pixel is on the tube or the sphere, with its normal, how far it is from
 * the edge, and, for a soma, its depth. Glowing in full, a cell drawn at the least width is drawn at twice it, to be
 * seen.
 */
function impostorOf(kind: Kind, u: GpuUniforms, glowing: boolean) {
  const word = attribute('aCell', 'uint');
  const cell = word.bitAnd(uint(CELL_MASK));
  const xy = cellXY({ cell });
  const texel = u.cells.load(xy);
  const glow = glowing
    ? typed<'float'>(cellGlow({ cell, highlighted: u.highlighted, glowTexel: u.glow.load(xy) }))
    : float(0);
  const least = float(MIN_RADIUS).mul(glow.add(1));
  const view = {
    view: cameraViewMatrix,
    world: cameraWorldMatrix,
    projection: cameraProjectionMatrix,
    vp: viewport,
  };
  if (kind === 'segment') {
    const quad = typed<'mat4'>(
      segmentQuad({
        corner: positionGeometry,
        word,
        shown: texel.a,
        least,
        endA: attribute('aA', 'vec4'),
        endB: attribute('aB', 'vec4'),
        chartA: attribute('aChartA', 'vec4'),
        chartB: attribute('aChartB', 'vec4'),
        morph: u.mix,
        shift: u.shift,
        ...view,
        near: cameraNear,
      })
    ).toVar();
    const surface = typed<'mat4'>(
      segmentSurface({
        q: screenCoordinate.xy,
        ends: flat(col(quad, 1)),
        radii: flat(col(quad, 2)),
      })
    ).toVar();
    return { word, cell, texel, glow, position: col(quad, 0).xyz, surface, depth: null };
  }
  const quad = typed<'mat4'>(
    somaQuad({
      corner: positionGeometry,
      shown: texel.a,
      least,
      sphere: attribute('aSoma', 'vec4'),
      chart: attribute('aSomaChart', 'vec4'),
      morph: u.mix,
      shift: u.shift,
      ...view,
    })
  ).toVar();
  const surface = typed<'mat4'>(
    somaSurface({
      p: varying(col(quad, 3).xyz),
      sphere: flat(col(quad, 1)),
      radiusPx: flat(col(quad, 2).x),
      projection: cameraProjectionMatrix,
    })
  ).toVar();
  return { word, cell, texel, glow, position: col(quad, 0).xyz, surface, depth: col(surface, 1).z };
}

/**
 * An impostor of `kind` in the look's material, three's standard one under the look's lights: the cell's colour from
 * the cell table where the vertex colour would go, lit by its glow, ringed as it glows on a light background, tone
 * mapped as Studio is on WebGL 2 and written as shown.
 */
function lookMaterial(kind: Kind, u: GpuUniforms, look: Look): THREE.MeshStandardNodeMaterial {
  const studio = look.material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardNodeMaterial({
    roughness: studio.roughness,
    metalness: studio.metalness,
  });
  const {
    word,
    cell,
    texel,
    glow,
    position,
    surface,
    depth: sphereDepth,
  } = impostorOf(kind, u, true);
  const [unknown, soma, axon, basal, apical] = u.sectionColours;
  const colour = flat(
    typed<'vec3'>(
      colourOf({
        cell,
        highlighted: u.highlighted,
        highlight: u.highlight,
        texel,
        type_: kind === 'segment' ? word.shiftRight(uint(TYPE_SHIFT)) : uint(1),
        glow,
        unknown,
        soma,
        axon,
        basal,
        apical,
      })
    )
  );
  const glowing = flat(glow);
  material.positionNode = position;
  material.colorNode = vec4(colour, 1);
  material.normalNode = col(surface, 0).xyz;
  material.roughnessNode = typed<'float'>(
    roughnessOf({ n: col(surface, 0).xyz, roughness: studio.roughness })
  );
  material.maskNode = col(surface, 0).w.greaterThan(0.5);
  // Lit where the lights do not reach as well.
  material.emissiveNode = colour.mul(glowing).mul(0.2);
  if (sphereDepth) material.depthNode = sphereDepth;
  const rim = typed<'float'>(rimOf({ edge: col(surface, 1), glow: glowing, rimOn: u.glowRim.w }));
  const lit = mix(output.rgb, u.glowRim.xyz, rim);
  const mapped = typed<'vec3'>(toneMapping(THREE.ACESFilmicToneMapping, float(EXPOSURE), lit));
  material.outputNode = vec4(typed<'vec3'>(sRGBTransferOETF(mapped)), output.a);
  return material;
}

/**
 * An impostor of `kind` drawn in a number in place of its shading, as `idMaterial` draws it: its cell's, or with
 * `segments`, its own, a soma's after the segments'.
 */
function idMaterial(kind: Kind, u: GpuUniforms, segments = false): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  const { cell, position, surface, depth: sphereDepth } = impostorOf(kind, u, false);
  let n: Node<'uint'> = cell;
  if (segments) n = kind === 'segment' ? instanceIndex : u.segments.add(cell);
  material.positionNode = position;
  if (sphereDepth) material.depthNode = sphereDepth;
  material.fragmentNode = keptUnless(
    col(surface, 0).w.lessThan(0.5),
    flat(typed<'vec4'>(cellId({ cell: n })))
  );
  material.blending = THREE.NoBlending;
  return material;
}

/** The impostors' materials on WebGPU: in the look, in their cells' numbers, and in their segments' numbers. */
export function impostorMaterials(u: GpuUniforms, look: Look) {
  return {
    segment: lookMaterial('segment', u, look),
    soma: lookMaterial('soma', u, look),
    ids: { segment: idMaterial('segment', u), soma: idMaterial('soma', u) },
    spots: { segment: idMaterial('segment', u, true), soma: idMaterial('soma', u, true) },
  };
}
