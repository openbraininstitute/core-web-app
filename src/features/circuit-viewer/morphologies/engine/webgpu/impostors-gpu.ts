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
import { surfaceOf } from './occlusion-gpu';

import type { Node } from 'three/webgpu';
import type { Look } from '@/features/viewer-3d/engine/looks';
import type { GpuUniforms } from './gpu-uniforms';

/**
 * As `impostors.ts` draws a segment and a soma, in WGSL, and a segment wide on screen as the tube itself. Pixels: the
 * fragment's position counts them from the top left of the target, y down, where WebGL's counts y up; geometry is
 * worked in pixels y up, as view space has it, and the ends handed to the fragments are turned over.
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
// The view point p's depth as the depth buffer takes it.
fn depthOf(p: vec3f, projection: mat4x4f) -> f32 {
  let clip = projection * vec4f(p, 1.0);
  return clip.z / clip.w;
}
// How far from the edge of a round surface r pixels in radius its point of normal n is drawn, seen along ray: its sine
// of the radius from the middle.
fn edgeOf(n: vec3f, ray: vec3f, r: f32) -> f32 {
  let facing = dot(n, -ray);
  return r * (1.0 - sqrt(max(1.0 - facing * facing, 0.0)));
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
 * A segment's ends in view space, each with its radius, and their radii in pixels and the µm a pixel spans at each; w
 * of the last column 1 where it is drawn.
 */
const segmentEnds = wgslFn(
  /* wgsl */ `
fn segmentEnds(word: u32, shown: f32, least: f32, endA: vec4f, endB: vec4f, chartA: vec4f, chartB: vec4f,
               morph: f32, shift: vec3f, view: mat4x4f, projection: mat4x4f, vp: vec4f, near: f32) -> mat4x4f {
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
  return mat4x4f(vec4f(a, ra), vec4f(b, rb), vec4f(ra / umA, rb / umB, umA, umB), vec4f(0.0, 0.0, 0.0, 1.0));
}`,
  [IMPOSTORS]
);

/**
 * A segment's quad, of its `ends`: the corner in the world, w 1 where it is drawn; its ends in the fragment's pixels;
 * the corner in view space. corner.x picks the end, corner.y the side. Drawn as the tube itself
 * where `tube` is 1 and flat where it is 0, a segment is drawn by the one draw whose kind its width on screen asks for
 * (`round`, the least radius in pixels of a tube); not drawn, its four corners are one point.
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
  let orthographic = isOrthographic(projection);
  let pa = pixelsUp(a, projection, vp);
  let pb = pixelsUp(b, projection, vp);
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
  return mat4x4f(world * vec4f(p, 1.0), vec4f(toFragment(pa, vp), toFragment(pb, vp)), vec4f(p, 0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

/**
 * Under pixel q, the normal of a segment's tube in view space, round across its width and across only, as far from its
 * edge, so that a round end carries on into the next segment without a seam; w 1 where the pixel is on it. And in the
 * second column how far the pixel is from the edge and the radius, in pixels, and the depth of the tube's surface as
 * the depth buffer takes it, which the quad does not write: it stands at the tube's nearest all across. `depths`: each
 * end's depth in view space and radius.
 */
const segmentSurface = wgslFn(
  /* wgsl */ `
fn segmentSurface(q: vec2f, ends: vec4f, radii: vec4f, depths: vec4f, projection: mat4x4f) -> mat4x4f {
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
  let depth = depthOf(vec3f(0.0, 0.0, mix(depths.x, depths.z, t) + mix(depths.y, depths.w, t) * n.z), projection);
  return mat4x4f(vec4f(n, select(0.0, 1.0, on)), vec4f(r * (1.0 - abs(s)), r, depth, 0.0), vec4f(0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

/**
 * Under the corner's point p, a segment drawn as the tube itself: a ball at each end of radius a.w and b.w, and the cone
 * between them (Inigo Quilez's rounded cone), met by the ray through the pixel. As `somaSurface` has it: the normal in
 * view space, w 1 where the pixel is on the tube; how far the pixel is from its edge and its radius, in pixels, and its
 * depth as the depth buffer takes it.
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
  // The nearest of where the ray meets a ball, and the cone between them from outside: the normal, and how far along.
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
      // Both roots, the way that loses no digits where the ray runs nearly along the cone's side.
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
  return mat4x4f(vec4f(hit.xyz, select(0.0, 1.0, on)), vec4f(edgeOf(hit.xyz, ray, r), r, depthOf(at, projection), 0.0),
                 vec4f(0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
);

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
  let n = normalize(at - centre);
  return mat4x4f(vec4f(n, select(0.0, 1.0, h >= 0.0)),
                 vec4f(edgeOf(n, ray, radiusPx), radiusPx, depthOf(at, projection), 0.0), vec4f(0.0), vec4f(0.0));
}`,
  [IMPOSTORS]
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

/** A segment drawn flat or as the tube itself (`GpuUniforms.tubeFrom`), or a soma. */
type Kind = 'segment' | 'tube' | 'soma';

/**
 * What every material of a kind shares: the cell, its texel and its glow where `glowing`, where its quad's corner is,
 * what the fragments take of it, and whether a pixel is on the tube or the sphere, with its normal, how far it is from
 * the edge, and its depth, which a segment drawn flat does not write. Glowing in full, a cell drawn at the least width
 * is drawn at twice it, to be seen.
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
  let quad: Node<'mat4'>;
  let shape: Node;
  if (kind === 'soma') {
    quad = typed<'mat4'>(
      somaQuad({
        corner: positionGeometry,
        shown: texel.a,
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
        shown: texel.a,
        least,
        endA: attribute('aA', 'vec4'),
        endB: attribute('aB', 'vec4'),
        chartA: attribute('aChartA', 'vec4'),
        chartB: attribute('aChartB', 'vec4'),
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
        round: u.tubeFrom,
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
            projection: cameraProjectionMatrix,
          });
  }
  const surface = typed<'mat4'>(shape).toVar();
  return { word, cell, texel, glow, position: col(quad, 0).xyz, surface, depth: col(surface, 1).z };
}

/**
 * An impostor of `kind` in the look's material, three's standard one under the look's lights: the cell's colour from
 * the cell table where the vertex colour would go, lit by its glow, ringed as it glows on a light background, tone
 * mapped as Studio is on WebGL 2 and written as shown; and for the occlusion, its surface (`surfaceOf`).
 */
function lookMaterial(kind: Kind, u: GpuUniforms, look: Look): THREE.MeshStandardNodeMaterial {
  const studio = look.material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardNodeMaterial({
    roughness: studio.roughness,
    metalness: studio.metalness,
  });
  const { word, cell, texel, glow, position, surface, depth } = impostorOf(kind, u, true);
  const [unknown, soma, axon, basal, apical] = u.sectionColours;
  const colour = flat(
    typed<'vec3'>(
      colourOf({
        cell,
        highlighted: u.highlighted,
        highlight: u.highlight,
        texel,
        type_: kind === 'soma' ? uint(1) : word.shiftRight(uint(TYPE_SHIFT)),
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
  if (kind !== 'segment') material.depthNode = depth;
  const rim = typed<'float'>(rimOf({ edge: col(surface, 1), glow: glowing, rimOn: u.glowRim.w }));
  const lit = mix(output.rgb, u.glowRim.xyz, rim);
  const mapped = typed<'vec3'>(toneMapping(THREE.ACESFilmicToneMapping, float(EXPOSURE), lit));
  material.outputNode = vec4(typed<'vec3'>(sRGBTransferOETF(mapped)), output.a);
  material.mrtNode = surfaceOf(col(surface, 0).xyz, depth);
  return material;
}

/**
 * An impostor of `kind` drawn in a number in place of its shading, as `idMaterial` draws it: its cell's, or with
 * `segments`, its own, a soma's after the segments'.
 */
function idMaterial(kind: Kind, u: GpuUniforms, segments = false): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  const { cell, position, surface, depth } = impostorOf(kind, u, false);
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
 * The impostors' materials on WebGPU: in the look, in their cells' numbers, and in their segments' numbers, the
 * segments in two draws, the flat ones and the tubes.
 */
export function impostorMaterials(u: GpuUniforms, look: Look) {
  const segments = <M extends THREE.Material>(of: (kind: Kind) => M) => [of('segment'), of('tube')];
  return {
    segment: segments((kind) => lookMaterial(kind, u, look)),
    soma: lookMaterial('soma', u, look),
    ids: { segment: segments((kind) => idMaterial(kind, u)), soma: idMaterial('soma', u) },
    spots: {
      segment: segments((kind) => idMaterial(kind, u, true)),
      soma: idMaterial('soma', u, true),
    },
  };
}
