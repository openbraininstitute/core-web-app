import {
  attribute,
  cameraNear,
  cameraProjectionMatrix,
  cameraViewMatrix,
  cameraWorldMatrix,
  float,
  instanceIndex,
  ivec2,
  mix,
  output,
  positionGeometry,
  screenCoordinate,
  select,
  sRGBTransferOETF,
  toneMapping,
  uint,
  varying,
  vec2,
  vec4,
  viewport,
  wgsl,
  wgslFn,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import { EXPOSURE } from '@/features/viewer-3d/engine/looks';

import { BY_SECTION } from '../cell-table';
import { CELL_MASK, HOLE, HOLE_WORD, MIN_RADIUS, QUAD_REACH, TYPE_SHIFT } from '../impostors';
import { PULSE_FRONT_WGSL, SOMA_LINE, SPIKE_COLOUR_WGSL, SPIKE_LIGHT_WGSL } from '../spike-light';
import { cellGlow, cellId, cellXY, col, flat, keptUnless, typed, VIEW } from './cells-wgsl';
import { NEAR_SHARE, NEAR_UM } from './culling-wgsl';
import { AO_COVER, surfaceAt, surfaceOf } from './occlusion-gpu';

import type { Node } from 'three/webgpu';
import type { Look } from '@/features/viewer-3d/engine/looks';
import type { ArenaStorage } from './arena-gpu';
import type { GpuUniforms } from './gpu-uniforms';

/**
 * Draws a segment and a soma in WGSL as `impostors.ts` does, and draws a segment that is wide on screen as the tube
 * itself. Pixels: the fragment's position counts them from the top left of the target with y down, while WebGL counts
 * y up. The geometry works in pixels with y up, as view space does, and flips the ends it hands to the fragments. The
 * culling's passes use the same text (`culling.ts`).
 */
export const IMPOSTORS_WGSL = /* wgsl */ `
// A view point in device pixels from the viewport's bottom left, y up.
fn pixelsUp(p: vec3f, projection: mat4x4f, vp: vec4f) -> vec2f {
  let clip = projection * vec4f(p, 1.0);
  return (clip.xy / clip.w * 0.5 + 0.5) * vp.zw;
}
// Pixels with y up, turned into the fragment's position, which counts y down.
fn toFragment(q: vec2f, vp: vec4f) -> vec2f {
  return vec2f(vp.x + q.x, vp.y + vp.w - q.y);
}
// The depth of the view point p as the depth buffer stores it.
fn depthOf(p: vec3f, projection: mat4x4f) -> f32 {
  let clip = projection * vec4f(p, 1.0);
  return clip.z / clip.w;
}
// How far from the edge of a round surface, r pixels in radius, the point with normal n is drawn when seen along ray.
// That point is drawn r times the sine of the angle between n and the ray from the middle.
fn edgeOf(n: vec3f, ray: vec3f, r: f32) -> f32 {
  let facing = dot(n, -ray);
  return r * (1.0 - sqrt(max(1.0 - facing * facing, 0.0)));
}
// The cell table marks a cell drawn in its sections' colours with an alpha just under opaque.
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
`;
const IMPOSTORS = wgsl(IMPOSTORS_WGSL, [VIEW]);

/**
 * A segment's ends in view space, each with its radius, then their radii in pixels and the µm a pixel spans at each
 * end. The last column's w is 1 where the segment is drawn: it is not a hole, nor of the `hidden` type
 * (`ImpostorUniforms.uHidden`).
 */
export const SEGMENT_ENDS_WGSL = /* wgsl */ `
fn segmentEnds(word: u32, hidden: u32, shown: f32, least: f32, endA: vec4f, endB: vec4f, chartA: vec4f,
               chartB: vec4f, morph: f32, shift: vec3f, view: mat4x4f, projection: mat4x4f, vp: vec4f,
               near: f32) -> mat4x4f {
  let none = mat4x4f(vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
  let type_ = word >> ${TYPE_SHIFT}u;
  if (shown < 0.5 || type_ == ${HOLE}u || type_ == hidden) { return none; }
  let A = mix(endA, chartA, morph);
  let B = mix(endB, chartB, morph);
  var a = (view * vec4f(A.xyz + shift, 1.0)).xyz;
  var b = (view * vec4f(B.xyz + shift, 1.0)).xyz;
  var ra = A.w;
  var rb = B.w;
  let orthographic = isOrthographic(projection);
  if (!orthographic) {
    // Cut the segment at twice the near plane's depth. An end nearer the eye than that has no place on screen, and up
    // to that depth the lifted quad stays behind the near plane.
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
  return mat4x4f(vec4f(a, ra), vec4f(b, rb), vec4f(ra / umA, rb / umB, umA, umB), vec4f(0.0, 0.0, 0.0, 1.0));
}`;
const segmentEnds = wgslFn(SEGMENT_ENDS_WGSL, [IMPOSTORS]);

/**
 * A segment's quad, built from its `ends`. Columns: the corner in the world, with w 1 where the segment is drawn; its
 * ends in the fragment's pixels; the corner in view space. corner.x picks the end, corner.y the side. `tube` is 1 in
 * the draw of tubes and 0 in the flat draw, and only the draw of the kind that the segment's width on screen asks for
 * draws it (`round` is the least radius in pixels of a tube). Where the segment is not drawn, its four corners are one
 * point.
 */
const segmentQuad = wgslFn(
  /* wgsl */ `
fn segmentQuad(corner: vec3f, ends: mat4x4f, tube: f32, round: f32, world: mat4x4f, projection: mat4x4f,
               vp: vec4f) -> mat4x4f {
  let none = mat4x4f(vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
  let radii = ends[2].xy;
  if (ends[3].w < 0.5 || (max(radii.x, radii.y) >= round) != (tube > 0.5)) { return none; }
  let a = ends[0].xyz;
  let b = ends[1].xyz;
  let ra = ends[0].w;
  let rb = ends[1].w;
  let umA = ends[2].z;
  let umB = ends[2].w;
  let pa = pixelsUp(a, projection, vp);
  let pb = pixelsUp(b, projection, vp);
  var along = pb - pa;
  let len = length(along);
  along = select(vec2f(1.0, 0.0), along / len, len > 1e-6);
  let across = vec2f(-along.y, along.x);
  let atB = corner.x > 0.0;
  let end = select(a, b, atB);
  // Keep the quad as wide on screen as the wider end along its whole length, plus a little. If the quad narrowed with
  // the tube, its side would cut into the wider end.
  let wide = ${QUAD_REACH} * max(radii.x, radii.y) * select(umA, umB, atB);
  let outward = select(-along, along, atB) + across * corner.y;
  let p = lifted(vec3f(end.xy + outward * wide, end.z), select(ra, rb, atB), projection);
  return mat4x4f(world * vec4f(p, 1.0), vec4f(toFragment(pa, vp), toFragment(pb, vp)), vec4f(p, 0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

/**
 * Under pixel q, the normal of a segment's tube in view space, with w 1 where the pixel is on the tube. The normal is
 * round across the tube's width only, set by how far the pixel is from the edge, so that a round end carries on into
 * the next segment without a seam. The second column holds how far the pixel is from the edge and the radius, in
 * pixels, and in w the depth in view space of the tube's surface. The quad does not write that depth: it stands at the
 * tube's nearest point all across. `depths`: each end's depth in view space and its radius.
 */
const segmentSurface = wgslFn(/* wgsl */ `
fn segmentSurface(q: vec2f, ends: vec4f, radii: vec4f, depths: vec4f) -> mat4x4f {
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
  let z = mix(depths.x, depths.z, t) + mix(depths.y, depths.w, t) * n.z;
  return mat4x4f(vec4f(n, select(0.0, 1.0, on)), vec4f(r * (1.0 - abs(s)), r, 0.0, z), vec4f(0.0), vec4f(0.0));
}`);

/**
 * Where the ray through p, the quad's point under the pixel, meets a segment drawn as the tube itself: a ball at each
 * end, of radius a.w and b.w, and the cone between them (Inigo Quilez's rounded cone). The columns are as in
 * `somaSurface`: the normal in view space, with w 1 where the pixel is on the tube; then how far the pixel is from the
 * edge and the radius, in pixels, the depth as the depth buffer stores it, and the depth in view space.
 */
const tubeSurface = wgslFn(
  /* wgsl */ `
fn tubeSurface(p: vec3f, a: vec4f, b: vec4f, radii: vec4f, projection: mat4x4f) -> mat4x4f {
  let ra = a.w;
  let rb = b.w;
  let ba = b.xyz - a.xyz;
  // The ray starts just in front of the tube, so that the arithmetic is at the tube's own scale.
  var ray = vec3f(0.0, 0.0, -1.0);
  var origin = vec3f(p.xy, max(a.z + ra, b.z + rb) + 1.0);
  if (!isOrthographic(projection)) {
    ray = normalize(p);
    let reach = 0.5 * length(ba) + max(ra, rb) + 1.0;
    origin = ray * max(dot(0.5 * (a.xyz + b.xyz), ray) - reach, 0.0);
  }
  let oa = origin - a.xyz;
  let ob = origin - b.xyz;
  let rr = ra - rb;
  let m0 = dot(ba, ba);
  let m1 = dot(ba, oa);
  let m2 = dot(ba, ray);
  let m3 = dot(ray, oa);
  let m6 = dot(ray, ob);
  // The ray's nearest hit on either ball, or on the cone between them from outside: the normal, and how far along.
  var hit = vec4f(0.0, 0.0, 1.0, 1e30);
  let h1 = m3 * m3 - dot(oa, oa) + ra * ra;
  if (h1 > 0.0) {
    let t = -m3 - sqrt(h1);
    if (t > 0.0) { hit = vec4f((oa + t * ray) / ra, t); }
  }
  let h2 = m6 * m6 - dot(ob, ob) + rb * rb;
  if (h2 > 0.0) {
    let t = -m6 - sqrt(h2);
    if (t > 0.0 && t < hit.w) { hit = vec4f((ob + t * ray) / rb, t); }
  }
  let d2 = m0 - rr * rr;
  if (d2 > 0.0) {
    let k2 = d2 - m2 * m2;
    let k1 = d2 * m3 - m1 * m2 + m2 * rr * ra;
    let k0 = d2 * dot(oa, oa) - m1 * m1 + m1 * rr * ra * 2.0 - m0 * ra * ra;
    let h = k1 * k1 - k0 * k2;
    if (h >= 0.0) {
      // Both roots, in the form that loses no precision where the ray runs nearly along the cone's side.
      let s = -(k1 + select(-1.0, 1.0, k1 >= 0.0) * sqrt(h));
      var roots = array<f32, 2>(1e30, 1e30);
      if (k2 != 0.0) { roots[0] = s / k2; }
      if (s != 0.0) { roots[1] = k0 / s; }
      for (var j = 0; j < 2; j++) {
        let t = roots[j];
        let y = m1 - ra * rr + t * m2;
        if (y > 0.0 && y < d2 && t > 0.0 && t < hit.w) { hit = vec4f(normalize(d2 * (oa + t * ray) - ba * y), t); }
      }
    }
  }
  let on = hit.w < 1e29;
  let at = origin + ray * select(0.0, hit.w, on);
  let r = mix(radii.x, radii.y, clamp(dot(at - a.xyz, ba) / max(m0, 1e-12), 0.0, 1.0));
  return mat4x4f(vec4f(hit.xyz, select(0.0, 1.0, on)), vec4f(edgeOf(hit.xyz, ray, r), r, depthOf(at, projection), at.z),
                 vec4f(0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

/**
 * A soma's quad. Columns: the corner in the world, with w 1 where the soma is drawn; the centre in view space and the
 * radius; the radius in pixels; the corner in view space.
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
    // Seen from d away, at the angle t off the view's axis, the sphere spans asin(r / d) either way and reaches
    // r / cos(t + asin(r / d)) outwards. lean / d2 is that cosine. Below an eighth, the eye is inside the sphere or
    // nearly so, and the soma is not drawn.
    let d2 = dot(c, c);
    let lean = -c.z * sqrt(max(d2 - r * r, 0.0)) - length(c.xy) * r;
    if (8.0 * lean < d2) { return none; }
    reach = r * d2 / lean;
  }
  // Make the quad a little wider than the sphere. The fragment writes its depth.
  let p = vec3f(c.xy + corner.xy * (1.2 * reach), c.z);
  return mat4x4f(world * vec4f(p, 1.0), vec4f(c, r), vec4f(r / um, 0.0, 0.0, 0.0), vec4f(p, 0.0));
}`,
  [VIEW]
);

/**
 * Where the ray through p, the quad's point under the pixel, meets the sphere: the normal in view space, with w 1 where
 * the pixel is on the sphere; then how far the pixel is from the edge and the radius, in pixels, the depth as the depth
 * buffer stores it, and the depth in view space.
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
  let n = normalize(at - centre);
  return mat4x4f(vec4f(n, select(0.0, 1.0, h >= 0.0)),
                 vec4f(edgeOf(n, ray, radiusPx), radiusPx, depthOf(at, projection), at.z), vec4f(0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

/** The cell's colour, linear: the highlight, or its own. */
const colourOf = wgslFn(
  /* wgsl */ `
fn colourOf(cell: u32, highlighted: u32, highlight: vec3f, texel: vec4f, type_: u32, unknown: vec3f, soma: vec3f,
            axon: vec3f, basal: vec3f, apical: vec3f) -> vec3f {
  if (cell == highlighted) { return highlight; }
  return ownColour(texel, type_, unknown, soma, axon, basal, apical);
}`,
  [IMPOSTORS]
);

/** How far the corner's end is from its cell's soma, µm, as `somaDistance` in `impostors.ts`. */
const somaDistance = wgslFn(/* wgsl */ `
fn somaDistance(corner: vec3f, endA: vec4f, endB: vec4f, soma: vec4f) -> f32 {
  return select(0.0, distance(select(endA.xyz, endB.xyz, corner.x > 0.0), soma.xyz), soma.w > 0.5);
}`);

/** A spike's light (`spike-light.ts`). */
const pulseFront = wgslFn(PULSE_FRONT_WGSL);
const spikeLight = wgslFn(SPIKE_LIGHT_WGSL);
const spikeColour = wgslFn(SPIKE_COLOUR_WGSL);

/**
 * The look's roughness, raised by how much the normal turns from one pixel to the next, as three's WebGL lighting does
 * it. On WebGL the impostor's normal is the one that turns, which spreads the highlight across a thin tube; three's
 * WebGPU lighting would use the flat quad's normal instead.
 */
const roughnessOf = wgslFn(/* wgsl */ `
fn roughnessOf(n: vec3f, roughness: f32) -> f32 {
  let turn = max(abs(dpdx(n)), abs(dpdy(n)));
  return min(max(roughness, 0.0525) + max(max(turn.x, turn.y), turn.z), 1.0);
}`);

/** A segment drawn flat or as the tube itself (`GpuUniforms.tubeFrom`), or a soma. */
type Kind = 'segment' | 'tube' | 'soma';

/**
 * What a segment is drawn from: its cell-and-type word, its ends, and its ends in the dendrogram. `round` is the least
 * radius in pixels of a tube, by which each draw keeps only the segments of its own kind (`GpuUniforms.tubeFrom` where
 * not given).
 */
interface SegmentInputs {
  word: Node<'uint'>;
  endA: Node<'vec4'>;
  endB: Node<'vec4'>;
  chartA: Node<'vec4'>;
  chartB: Node<'vec4'>;
  round?: Node<'float'>;
}

/** A segment read from its quad's attributes. */
const fromAttributes = (): SegmentInputs => ({
  word: attribute('aCell', 'uint'),
  endA: attribute('aA', 'vec4'),
  endB: attribute('aB', 'vec4'),
  chartA: attribute('aChartA', 'vec4'),
  chartB: attribute('aChartB', 'vec4'),
});

/** Which of the culling's lists to read: those kept to hide others, drawn to depth before the tests, or those seen. */
type List = 'kept' | 'seen';

/**
 * The arena's segment for this instance. Where the arena is culled (`listed`), it is the one at the instance's place in
 * `list` for the draw's kind: the list holds the flat segments from its start and the tubes back from its end. Where
 * it is not culled, every segment is drawn in turn. An index at or past the arena's end gives a hole, which is not
 * drawn. With no dendrogram, the segment's ends stand in for it. The culling chose each seen segment's kind, and its
 * draw keeps that choice. A kept segment is drawn by its kind now, so a kept segment whose kind changed is left out,
 * which is allowed.
 */
function fromArena(u: GpuUniforms, arena: ArenaStorage, kind: 'segment' | 'tube', list: List) {
  const { capacity, end } = arena;
  const listed = arena.listed.equal(uint(1));
  const first = capacity.mul(uint(list === 'kept' ? 0 : 1));
  const at =
    kind === 'tube'
      ? first.add(capacity).sub(uint(1)).sub(instanceIndex)
      : first.add(instanceIndex);
  const i = select(listed, arena.lists.element(at), instanceIndex).toVar();
  const endA = typed<'vec4'>(arena.ends.element(i.mul(uint(2))));
  const endB = typed<'vec4'>(arena.ends.element(i.mul(uint(2)).add(uint(1))));
  const word = typed<'uint'>(select(i.lessThan(end), arena.words.element(i), uint(HOLE_WORD)));
  const round =
    list === 'kept' ? u.tubeFrom : select(listed, float(kind === 'tube' ? 0 : 1e30), u.tubeFrom);
  return { word, endA, endB, chartA: endA, chartB: endB, round } satisfies SegmentInputs;
}

/**
 * Whether, where the arena is culled, a tube's pixel lies behind the farthest depth drawn there before the tests. If
 * so, what was drawn there covers it, and the nearest of that is drawn instead. `viewZ`: the tube's depth there in view
 * space.
 */
function behindOf(arena: ArenaStorage, viewZ: Node<'float'>): Node<'bool'> {
  const away = viewZ.negate();
  const nearest = away.sub(away.mul(NEAR_SHARE).add(NEAR_UM));
  const farthest = arena.farthest.load(ivec2(screenCoordinate.xy)).x;
  return arena.listed.equal(uint(1)).and(nearest.greaterThan(farthest));
}

/**
 * What every material of a kind shares: the cell, its texel, and, where `glowing`, how lit it is by a spike
 * (`spike-light.ts`); where the quad's corner is and what the fragments take of it; and whether a pixel is on the tube
 * or the sphere, with its normal, how far it is from the edge, and its depth. The depth comes as the depth buffer
 * stores it, which a segment drawn flat does not write, and in view space. A cell that glows in full and is drawn at
 * the least width is drawn at twice that width, so that it can be seen. The word, and a segment's ends, are read from
 * `inputs`. With `litOnly`, an unlit cell's quads are not drawn.
 */
function impostorOf(
  kind: Kind,
  u: GpuUniforms,
  glowing: boolean,
  inputs: SegmentInputs,
  litOnly = false
) {
  const { word } = inputs;
  const cell = word.bitAnd(uint(CELL_MASK));
  const xy = cellXY({ cell });
  const texel = u.cells.load(xy);
  const glow = glowing
    ? typed<'float'>(cellGlow({ cell, highlighted: u.highlighted, glowTexel: u.glow.load(xy) }))
    : float(0);
  const shown = litOnly ? select(glow.greaterThan(0), texel.a, float(0)) : texel.a;
  const least = float(MIN_RADIUS).mul(glow.add(1));
  let quad: Node<'mat4'>;
  let shape: Node;
  if (kind === 'soma') {
    quad = typed<'mat4'>(
      somaQuad({
        corner: positionGeometry,
        shown,
        least,
        sphere: attribute('aSoma', 'vec4'),
        chart: attribute('aSomaChart', 'vec4'),
        morph: u.mix,
        shift: u.shift,
        view: cameraViewMatrix,
        world: cameraWorldMatrix,
        projection: cameraProjectionMatrix,
        vp: viewport,
      })
    ).toVar();
    shape = somaSurface({
      p: varying(col(quad, 3).xyz),
      sphere: flat(col(quad, 1)),
      radiusPx: flat(col(quad, 2).x),
      projection: cameraProjectionMatrix,
    });
  } else {
    const ends = typed<'mat4'>(
      segmentEnds({
        word,
        hidden: u.hidden,
        shown,
        least,
        endA: inputs.endA,
        endB: inputs.endB,
        chartA: inputs.chartA,
        chartB: inputs.chartB,
        morph: u.mix,
        shift: u.shift,
        view: cameraViewMatrix,
        projection: cameraProjectionMatrix,
        vp: viewport,
        near: cameraNear,
      })
    ).toVar();
    quad = typed<'mat4'>(
      segmentQuad({
        corner: positionGeometry,
        ends,
        tube: float(kind === 'tube' ? 1 : 0),
        round: inputs.round ?? u.tubeFrom,
        world: cameraWorldMatrix,
        projection: cameraProjectionMatrix,
        vp: viewport,
      })
    ).toVar();
    const radii = flat(col(ends, 2));
    shape =
      kind === 'tube'
        ? tubeSurface({
            p: varying(col(quad, 2).xyz),
            a: flat(col(ends, 0)),
            b: flat(col(ends, 1)),
            radii,
            projection: cameraProjectionMatrix,
          })
        : segmentSurface({
            q: screenCoordinate.xy,
            ends: flat(col(quad, 1)),
            radii,
            depths: flat(vec4(col(ends, 0).zw, col(ends, 1).zw)),
          });
  }
  const surface = typed<'mat4'>(shape).toVar();
  const { z: depth, w: viewZ } = col(surface, 1);
  const fromSoma =
    kind === 'soma'
      ? float(0)
      : somaDistance({
          corner: positionGeometry,
          endA: inputs.endA,
          endB: inputs.endB,
          soma: u.somas.load(xy),
        });
  const pulse = typed<'float'>(pulseFront({ d: fromSoma, glow, afterglow: u.afterglow }));
  const spiking = typed<'float'>(spikeLight({ x: varying(pulse), glow: flat(glow) }));
  return { word, cell, texel, spiking, position: col(quad, 0).xyz, surface, depth, viewZ };
}

/** The cell's colour (`colourOf`), the same across the impostor. */
function cellColour(
  kind: Kind,
  u: GpuUniforms,
  word: Node<'uint'>,
  cell: Node<'uint'>,
  texel: Node<'vec4'>
): Node<'vec3'> {
  const [unknown, soma, axon, basal, apical] = u.sectionColours;
  return flat(
    typed<'vec3'>(
      colourOf({
        cell,
        highlighted: u.highlighted,
        highlight: u.highlight,
        texel,
        type_: kind === 'soma' ? uint(1) : word.shiftRight(uint(TYPE_SHIFT)),
        unknown,
        soma,
        axon,
        basal,
        apical,
      })
    )
  );
}

/** A lit cell of `kind` in its spike's colour, linear. */
function spikeLit(kind: Kind, colour: Node<'vec3'>, facing: Node<'float'>, u: GpuUniforms) {
  const neon = kind === 'soma' ? u.neon.mul(vec2(1, SOMA_LINE)) : u.neon;
  return typed<'vec3'>(spikeColour({ own: colour, facing, neon, hue: u.spikeHue }));
}

/** Tone mapped as Studio is on WebGL 2. */
function toneMapped(colour: Node<'vec3'>): Node<'vec3'> {
  return typed<'vec3'>(toneMapping(THREE.ACESFilmicToneMapping, float(EXPOSURE), colour));
}

/** How much of a lit cell shows through what covers it: less the deeper it lies. */
const THROUGH = 0.6;
/**
 * How deep a lit cell shows through what covers it, in CSS pixels at the orbit's target, and no deeper than the culling
 * keeps (`KEEP_UM`). The cell shows as a line along its middle this many CSS pixels wide, and a soma as a dot this many
 * times as wide. All three stay the same on screen at any zoom.
 */
export const THROUGH_CSS_PX = 60;
export const THROUGH_LINE_CSS_PX = 3;
const THROUGH_DOT = 2;
/** A lit cell nearer the front than this, µm, is the front itself, which the look draws. */
const FRONT_UM = 0.5;

/** How far a pixel `away` µm from the eye lies behind what the frame drew in front there (`Occlusion.front`), µm. */
function behindFront(u: GpuUniforms, away: Node<'float'>) {
  const p = ivec2(screenCoordinate.xy);
  const cover = u.frontPicture.load(p).a;
  return { cover, behind: away.sub(surfaceAt(u.frontSurface.load(p), cover).away) };
}

/**
 * A lit cell of `kind`, drawn over the frame where it lies up to `throughUm` behind what was drawn in front. It shows
 * as a line along its middle in its spike's colour, as opaque as `THROUGH` times how lit it is, and fainter the deeper
 * it lies.
 */
function throughMaterial(
  kind: Kind,
  u: GpuUniforms,
  inputs: SegmentInputs = fromAttributes()
): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  const { word, cell, texel, spiking, position, surface, viewZ } = impostorOf(
    kind,
    u,
    true,
    inputs,
    true
  );
  const { cover, behind } = behindFront(u, viewZ.negate());
  const { x: edge, y: radius } = col(surface, 1);
  const half = kind === 'soma' ? u.throughHalfPx.mul(THROUGH_DOT) : u.throughHalfPx;
  const line = radius.sub(edge).sub(half).add(0.5).clamp(0, 1).oneMinus();
  material.positionNode = position;
  material.maskNode = col(surface, 0)
    .w.greaterThan(0.5)
    .and(line.greaterThan(0))
    .and(cover.greaterThanEqual(AO_COVER))
    .and(behind.greaterThan(FRONT_UM))
    .and(behind.lessThan(u.throughUm));
  const colour = cellColour(kind, u, word, cell, texel);
  const mapped = toneMapped(spikeLit(kind, colour, col(surface, 0).z, u));
  const shown = spiking.mul(THROUGH).mul(line).mul(behind.div(u.throughUm).oneMinus());
  material.outputNode = vec4(typed<'vec3'>(sRGBTransferOETF(mapped)), shown);
  material.transparent = true;
  material.depthTest = false;
  material.depthWrite = false;
  return material;
}

/**
 * An impostor of `kind` in the look's material: three's standard material under the look's lights. It takes the cell's
 * colour from the cell table where the vertex colour would go, lights it by a spike (`spike-light.ts`), tone maps it as
 * Studio is on WebGL 2 and writes it as shown. It also writes its surface for the occlusion (`surfaceOf`). A tube of a
 * culled `arena` is not drawn where it lies behind what was drawn before the tests (`behindOf`): it writes its own
 * depth, so it would otherwise be shaded there under what covers it.
 */
function lookMaterial(
  kind: Kind,
  u: GpuUniforms,
  look: Look,
  inputs: SegmentInputs = fromAttributes(),
  arena?: ArenaStorage
): THREE.MeshStandardNodeMaterial {
  const studio = look.material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardNodeMaterial({
    roughness: studio.roughness,
    metalness: studio.metalness,
  });
  const { word, cell, texel, spiking, position, surface, depth, viewZ } = impostorOf(
    kind,
    u,
    true,
    inputs
  );
  const colour = cellColour(kind, u, word, cell, texel);
  material.positionNode = position;
  material.colorNode = vec4(colour, 1);
  material.normalNode = col(surface, 0).xyz;
  material.roughnessNode = typed<'float'>(
    roughnessOf({ n: col(surface, 0).xyz, roughness: studio.roughness })
  );
  const on = col(surface, 0).w.greaterThan(0.5);
  material.maskNode = kind === 'tube' && arena ? on.and(behindOf(arena, viewZ).not()) : on;
  if (kind !== 'segment') material.depthNode = depth;
  const facing = col(surface, 0).z;
  const spike = spikeLit(kind, colour, facing, u);
  let shown = toneMapped(mix(output.rgb, spike, spiking));
  // Add light past white, on a screen that can show it.
  if (u.overWhite > 0) shown = shown.add(toneMapped(spike).mul(spiking.mul(u.overWhite)));
  material.outputNode = vec4(typed<'vec3'>(sRGBTransferOETF(shown)), output.a);
  material.mrtNode = surfaceOf(col(surface, 0).xyz, viewZ, spiking);
  return material;
}

/**
 * An impostor of `kind` drawn in a number in place of its shading, as `idMaterial` draws it: its cell's number, or,
 * with `segments`, its own, where the somas are numbered after the segments.
 */
function idMaterial(
  kind: Kind,
  u: GpuUniforms,
  segments = false,
  inputs = fromAttributes()
): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  const { cell, position, surface, depth } = impostorOf(kind, u, false, inputs);
  let n: Node<'uint'> = cell;
  if (segments) n = kind === 'soma' ? u.segments.add(cell) : instanceIndex;
  material.positionNode = position;
  if (kind !== 'segment') material.depthNode = depth;
  material.fragmentNode = keptUnless(
    col(surface, 0).w.lessThan(0.5),
    flat(typed<'vec4'>(cellId({ cell: n })))
  );
  material.blending = THREE.NoBlending;
  return material;
}

/**
 * A segment of `kind` drawn to depth only, placed and masked as in the look, for the culling's tests. It writes the
 * same depth as the look's material.
 */
function depthMaterial(
  kind: 'segment' | 'tube',
  u: GpuUniforms,
  inputs: SegmentInputs
): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  const { position, surface, depth } = impostorOf(kind, u, true, inputs);
  material.positionNode = position;
  material.maskNode = col(surface, 0).w.greaterThan(0.5);
  if (kind === 'tube') material.depthNode = depth;
  material.colorWrite = false;
  return material;
}

/** A segment's materials for its two draws: the flat segments and the tubes. */
const segments = <M extends THREE.Material>(of: (kind: 'segment' | 'tube') => M) => [
  of('segment'),
  of('tube'),
];

/**
 * The impostors' materials on WebGPU: in the look, in their cells' numbers, in their segments' numbers, and lit through
 * what covers them. Each set draws the segments in two draws, the flat ones and the tubes.
 */
export function impostorMaterials(u: GpuUniforms, look: Look) {
  return {
    segment: segments((kind) => lookMaterial(kind, u, look)),
    soma: lookMaterial('soma', u, look),
    ids: { segment: segments((kind) => idMaterial(kind, u)), soma: idMaterial('soma', u) },
    spots: {
      segment: segments((kind) => idMaterial(kind, u, true)),
      soma: idMaterial('soma', u, true),
    },
    through: {
      segment: segments((kind) => throughMaterial(kind, u)),
      soma: throughMaterial('soma', u),
    },
  };
}

/**
 * The materials for the segments of the arena whose buffers `arena` binds. The look and cell-number materials draw the
 * segments seen; the depth and lit-through materials draw the segments kept (`fromArena`), which include those seen.
 */
export function arenaMaterials(u: GpuUniforms, look: Look, arena: ArenaStorage) {
  return {
    segment: segments((kind) =>
      lookMaterial(kind, u, look, fromArena(u, arena, kind, 'seen'), arena)
    ),
    ids: segments((kind) => idMaterial(kind, u, false, fromArena(u, arena, kind, 'seen'))),
    kept: segments((kind) => depthMaterial(kind, u, fromArena(u, arena, kind, 'kept'))),
    through: segments((kind) => throughMaterial(kind, u, fromArena(u, arena, kind, 'kept'))),
  };
}
