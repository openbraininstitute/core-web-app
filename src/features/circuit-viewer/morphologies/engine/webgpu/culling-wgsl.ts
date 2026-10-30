/**
 * The culling's passes, for the arena's segments and for the somas drawn alone. They measure depth in µm from the eye,
 * so the same tests hold in perspective. Each pass is built with the impostors' own WGSL (`depth-pyramid.ts`), whose
 * `segmentEnds` places a segment as its draw does.
 */

import { QUAD_REACH } from '../impostors';

/** A segment is taken to be nearer than it is by this many µm plus this share of its distance, to cover rounding. */
export const NEAR_UM = 0.02;
export const NEAR_SHARE = 1e-6;
/** How far behind what hides it a segment may be and still be kept, µm, so that it hides others the next frame. */
export const KEEP_UM = 10;
/**
 * A block's box is tested on at most this many texels a side, and a segment is walked pixel by pixel over at most this
 * many rows; past that, the test uses a coarser level of the pyramid. 4 rows was the fastest while the whole brain
 * turned.
 */
const BLOCK_TEXELS = 8;
const ROWS = 4;

const VIEW = /* wgsl */ `
struct View {
  view: mat4x4f,
  projection: mat4x4f,
  // The viewport, as three's: x, y, width and height in device pixels.
  vp: vec4f,
  // xyz: what the arena's positions are moved by; w: the near plane's distance.
  shift: vec4f,
  // x: the far plane's distance; y: the least radius of a tube, px; z: the least radius of any, px; w: a soma's, µm.
  more: vec4f,
  // x: the pyramid's levels; y: the blocks; z: the arena's capacity; w: the somas, or for the segments the type not
  // drawn, as segmentEnds takes it.
  counts: vec4u,
}
@group(0) @binding(0) var<uniform> view: View;

// Where a view-space point falls, in device pixels from the top left with y down, as the fragment's position counts.
fn texelOf(p: vec3f) -> vec2f {
  return toFragment(pixelsUp(p, view.projection, view.vp), view.vp);
}
fn nearer(away: f32) -> f32 { return away - away * ${NEAR_SHARE} - ${NEAR_UM}; }
`;

const FARTHEST = /* wgsl */ `
// The farthest depth drawn under texel p of level m, µm from the eye. Level 0 is the full-size depth.
fn farthest(p: vec2i, m: u32) -> f32 {
  if (m == 0u) { return textureLoad(full, p, 0).x; }
  let l = i32(m) - 1;
  return textureLoad(hiz, min(p, vec2i(textureDimensions(hiz, l)) - 1), l).x;
}
`;

const BLOCK = /* wgsl */ `
struct Block { lo: vec3f, first: u32, hi: vec3f, count: u32 }
`;

const DRAW_ARGS = /* wgsl */ `
struct Args { indices: u32, instances: atomic<u32>, firstIndex: u32, baseVertex: u32, firstInstance: u32 }
`;

/**
 * Turns the depth drawn before the tests into µm from the eye, taking the farthest of each pixel's samples. It adds a
 * few of the depth buffer's steps to cover the precision lost in turning depth back into distance.
 */
export const RESOLVE = /* wgsl */ `
${VIEW}
@group(0) @binding(1) var depth: texture_depth_multisampled_2d;
@group(0) @binding(2) var full: texture_storage_2d<r32float, write>;
@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(full);
  if (id.x >= size.x || id.y >= size.y) { return; }
  var d = 0.0;
  for (var s = 0u; s < textureNumSamples(depth); s++) { d = max(d, textureLoad(depth, vec2i(id.xy), s)); }
  d = min(d + 2.4e-7, 1.0);
  let p = view.projection;
  let z = (p[3][2] - d * p[3][3]) / (d * p[2][3] - p[2][2]);
  textureStore(full, vec2i(id.xy), vec4f(-z, 0.0, 0.0, 1.0));
}
`;

/**
 * Builds the pyramid: each texel of a level holds the farthest of the 2 × 2 texels under it, plus a third row or column
 * at the edge of an odd side, so that a texel is never nearer than any pixel it stands for.
 */
export const PYRAMID = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<r32float, write>;
@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let size = vec2i(textureDimensions(dst));
  let p = vec2i(id.xy);
  if (p.x >= size.x || p.y >= size.y) { return; }
  let n = vec2i(textureDimensions(src));
  let more = select(vec2i(1), vec2i(2), ((n & vec2i(1)) == vec2i(1)) & (p == size - 1));
  var d = 0.0;
  for (var y = 0; y <= more.y; y++) {
    for (var x = 0; x <= more.x; x++) {
      d = max(d, textureLoad(src, min(p * 2 + vec2i(x, y), n - 1), 0).x);
    }
  }
  textureStore(dst, p, vec4f(d, 0.0, 0.0, 1.0));
}
`;

/**
 * A block is up to 64 segments of one box. A block whose box may show, or is hidden by no more than \`KEEP_UM\`, is
 * handed on to the next pass, which tests its segments one by one. The box is widened by the least radius a segment
 * is drawn with.
 */
export const BLOCKS = /* wgsl */ `
${VIEW}${BLOCK}${FARTHEST}
struct Counters { blocks: atomic<u32>, candidates: atomic<u32>, pad: vec2u }
@group(0) @binding(1) var full: texture_2d<f32>;
@group(0) @binding(2) var hiz: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> blocks: array<Block>;
@group(0) @binding(4) var<storage, read_write> passed: array<u32>;
@group(0) @binding(5) var<storage, read_write> counters: Counters;

fn shows(bl: Block) -> bool {
  let orthographic = isOrthographic(view.projection);
  var lo = vec2f(1e30);
  var hi = vec2f(-1e30);
  var away = 1e30;
  for (var k = 0u; k < 8u; k++) {
    let corner = select(bl.lo, bl.hi, vec3<bool>((k & 1u) != 0u, (k & 2u) != 0u, (k & 4u) != 0u));
    let p = (view.view * vec4f(corner + view.shift.xyz, 1.0)).xyz;
    // A corner near the eye or behind it has no place on screen to test.
    if (!orthographic && -p.z < 2.0 * view.shift.w) { return true; }
    let q = texelOf(p);
    lo = min(lo, q);
    hi = max(hi, q);
    away = min(away, -p.z);
  }
  let least = ${QUAD_REACH} * view.more.z;
  lo -= least + 1.0;
  hi += least + 1.0;
  if (hi.x < 0.0 || hi.y < 0.0 || lo.x >= view.vp.z || lo.y >= view.vp.w) { return false; }
  let near = nearer(away - least * pixelUm(-away, view.projection, view.vp)) - ${KEEP_UM};
  if (near > view.more.x) { return false; }
  let a = clamp(lo, vec2f(0.0), view.vp.zw - 1.0);
  let b = clamp(hi, vec2f(0.0), view.vp.zw - 1.0);
  let m = u32(clamp(ceil(log2(max(max(b.x - a.x, b.y - a.y) / ${BLOCK_TEXELS}.0, 1.0))), 0.0, f32(view.counts.x)));
  let t0 = vec2i(a) >> vec2u(m);
  let t1 = vec2i(b) >> vec2u(m);
  for (var y = t0.y; y <= t1.y; y++) {
    for (var x = t0.x; x <= t1.x; x++) {
      if (near <= farthest(vec2i(x, y), m)) { return true; }
    }
  }
  return false;
}

@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {
  let c = id.x;
  if (c >= view.counts.y) { return; }
  let bl = blocks[c];
  if (bl.count == 0u || !shows(bl)) { return; }
  passed[atomicAdd(&counters.blocks, 1u)] = c;
  atomicAdd(&counters.candidates, bl.count);
}
`;

/** Sizes the next pass by the blocks handed on: up to 512 workgroups a row. */
export const ARGS = /* wgsl */ `
@group(0) @binding(0) var<storage, read> counters: array<u32>;
@group(0) @binding(1) var<storage, read_write> dispatch: array<u32>;
@compute @workgroup_size(1) fn main() {
  dispatch[0] = min(counters[0], 512u);
  dispatch[1] = (counters[0] + 511u) / 512u;
  dispatch[2] = 1u;
}
`;

/**
 * Tests each segment of the blocks handed on against the farthest depth drawn before it. First the whole segment is
 * tested against the 2 × 2 texels of the level that holds it; where that leaves it open, it is tested texel by texel
 * along its length. All along, it is taken at its nearest (the nearest of its ends less its radius, which neither its
 * flat quad nor its tube is nearer than) and as wide as its quad. Segments seen go on the seen list. Segments seen, and
 * those hidden by no more than \`KEEP_UM\`, go on the kept list, which the next frame draws to depth before its tests:
 * when the view moves, what was seen parts in thin cracks, and with nothing behind them every block would show through
 * one. A segment as wide on screen as a tube (\`GpuUniforms.tubeFrom\`) goes in the tubes' part of the lists. Each list
 * is as long as the arena, so no frame can overfill it. A block with a kept segment is marked, a bit a block
 * (\`marked\`), so that the boxes seen can be read back.
 */
export const SEGMENTS = /* wgsl */ `
${VIEW}${BLOCK}${FARTHEST}${DRAW_ARGS}
struct Draws { keptFlat: Args, keptTubes: Args, seenFlat: Args, seenTubes: Args }
@group(0) @binding(1) var full: texture_2d<f32>;
@group(0) @binding(2) var hiz: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> blocks: array<Block>;
@group(0) @binding(4) var<storage, read> passed: array<u32>;
@group(0) @binding(5) var<storage, read> counters: array<u32>;
@group(0) @binding(6) var<storage, read> ends: array<vec4f>;
@group(0) @binding(7) var<storage, read> words: array<u32>;
@group(0) @binding(8) var<storage, read_write> lists: array<u32>;
@group(0) @binding(9) var<storage, read_write> draws: Draws;
@group(0) @binding(10) var<storage, read_write> marked: array<atomic<u32>>;

// 0 out of view, 1 hidden as a whole, 2 hidden texel by texel, 3 seen, 4 hidden by little enough to be kept. a, b:
// its ends on screen, px; r: how far it reaches from the line between them, px; near: its nearest, µm from the eye.
fn seen(a: vec2f, b: vec2f, r: f32, near: f32) -> u32 {
  let lo = min(a, b) - r;
  let hi = max(a, b) + r;
  if (hi.x < 0.0 || hi.y < 0.0 || lo.x >= view.vp.z || lo.y >= view.vp.w || near > view.more.x) { return 0u; }
  let top = view.vp.zw - 1.0;
  let ext = max(hi.x - lo.x, hi.y - lo.y);
  let mc = u32(clamp(ceil(log2(max(ext, 1.0))), 0.0, f32(view.counts.x)));
  let c0 = vec2i(clamp(lo, vec2f(0.0), top)) >> vec2u(mc);
  let c1 = vec2i(clamp(hi, vec2f(0.0), top)) >> vec2u(mc);
  var open = false;
  for (var y = c0.y; y <= c1.y; y++) {
    for (var x = c0.x; x <= c1.x; x++) {
      open = open || near - ${KEEP_UM} <= farthest(vec2i(x, y), mc);
    }
  }
  if (!open) { return 1u; }

  // Walk row by row along the segment's major axis, on the level where that takes few enough rows. On the full-size
  // level a pixel counts if its centre is on the segment, as when it is drawn; on a coarser level a texel counts if it
  // may touch the segment at all.
  let m = u32(clamp(ceil(log2(max(ext / ${ROWS}.0, 1.0))), 0.0, f32(view.counts.x)));
  let k = 1.0 / f32(1u << m);
  let pad = select(0.01, 0.7072, m > 0u);
  let ta = a * k;
  let rr = r * k;
  let d = (b - a) * k;
  let xMajor = abs(d.x) > abs(d.y);
  var am = ta.y;
  var an = ta.x;
  var dm = d.y;
  var dn = d.x;
  var size = (vec2i(view.vp.zw) + ((1i << m) - 1)) >> vec2u(m);
  if (xMajor) {
    am = ta.x;
    an = ta.y;
    dm = d.x;
    dn = d.y;
    size = size.yx;
  }
  var inv = 0.0;
  var slope = 1.0;
  if (abs(dm) > 1e-6) {
    inv = 1.0 / dm;
    slope = sqrt(1.0 + dn * inv * dn * inv);
  }
  let hw = (rr + pad) * slope;
  let l2 = dot(d, d);
  let row0 = max(i32(floor(min(am, am + dm) - rr - pad)), 0);
  let row1 = min(i32(floor(max(am, am + dm) + rr + pad)), size.y - 1);
  var kept = false;
  for (var row = row0; row <= row1; row++) {
    let pm = f32(row) + 0.5 - am;
    let nc = an + dn * clamp(pm * inv, 0.0, 1.0);
    let col0 = max(i32(ceil(nc - hw - 0.5)), 0);
    let col1 = min(i32(floor(nc + hw - 0.5)), size.x - 1);
    for (var col = col0; col <= col1; col++) {
      let pn = f32(col) + 0.5 - an;
      var t = 0.0;
      if (l2 > 0.0) { t = clamp((pm * dm + pn * dn) / l2, 0.0, 1.0); }
      if (length(vec2f(pm - dm * t, pn - dn * t)) > rr + pad) { continue; }
      var p = vec2i(col, row);
      if (xMajor) { p = vec2i(row, col); }
      let behind = near - farthest(p, m);
      if (behind <= 0.0) { return 3u; }
      kept = kept || behind <= ${KEEP_UM};
    }
  }
  return select(2u, 4u, kept);
}

// Puts segment \`i\` on the lists it belongs on; returns whether it is kept.
fn listed(i: u32) -> bool {
  let A = ends[2u * i];
  let B = ends[2u * i + 1u];
  let e = segmentEnds(words[i], view.counts.w, 1.0, view.more.z, A, B, A, B, 0.0, view.shift.xyz, view.view,
                      view.projection, view.vp, view.shift.w);
  // A hole, a hidden segment, or one behind the eye: it is drawn neither to be seen nor to hide others.
  if (e[3].w < 0.5) { return false; }
  let radii = e[2].xy;
  let near = nearer(min(-e[0].z - e[0].w, -e[1].z - e[1].w));
  let v = seen(texelOf(e[0].xyz), texelOf(e[1].xyz), ${QUAD_REACH} * max(radii.x, radii.y), near);
  if (v < 3u) { return false; }
  let tube = max(radii.x, radii.y) >= view.more.y;
  let cap = view.counts.z;
  if (tube) {
    lists[cap - 1u - atomicAdd(&draws.keptTubes.instances, 1u)] = i;
  } else {
    lists[atomicAdd(&draws.keptFlat.instances, 1u)] = i;
  }
  if (v != 3u) { return true; }
  if (tube) {
    lists[2u * cap - 1u - atomicAdd(&draws.seenTubes.instances, 1u)] = i;
  } else {
    lists[cap + atomicAdd(&draws.seenFlat.instances, 1u)] = i;
  }
  return true;
}

var<workgroup> keeps: atomic<u32>;

// One workgroup per block: it tests the block's segments, and marks the block once if any segment is kept.
@compute @workgroup_size(64) fn main(@builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_index) lid: u32) {
  let g = wid.y * 512u + wid.x;
  var c = 0u;
  if (g < counters[0]) {
    c = passed[g];
    let bl = blocks[c];
    if (lid < bl.count && listed(bl.first + lid)) { atomicStore(&keeps, 1u); }
  }
  workgroupBarrier();
  if (lid == 0u && atomicLoad(&keeps) != 0u) { atomicOr(&marked[c >> 5u], 1u << (c & 31u)); }
}
`;

/**
 * Tests each soma of the cloud drawn alone, one thread per soma. A soma is taken as a sphere of the radius it may be
 * drawn at, at its nearest, and tested against the farthest depth drawn before it, on the pyramid level where its box
 * on screen is 2 × 2 texels. Somas seen go on the seen list; they and those hidden by no more than \`KEEP_UM\` go on
 * the kept list, which the next frame draws to depth before the test. A cell the cell table hides goes on neither: it
 * draws nothing, so it hides nothing behind it, and the test would count it as seen. The somas are \`positions\`,
 * three floats each, in the order of their cells.
 */
export const SOMAS = /* wgsl */ `
${VIEW}${FARTHEST}${DRAW_ARGS}
struct Draws { kept: Args, seen: Args }
@group(0) @binding(1) var full: texture_2d<f32>;
@group(0) @binding(2) var hiz: texture_2d<f32>;
@group(0) @binding(3) var cells: texture_2d<f32>;
@group(0) @binding(4) var<storage, read> positions: array<f32>;
@group(0) @binding(5) var<storage, read_write> kept: array<u32>;
@group(0) @binding(6) var<storage, read_write> seen: array<u32>;
@group(0) @binding(7) var<storage, read_write> draws: Draws;

// 0 out of view, or hidden by more than KEEP_UM; 1 hidden by no more; 2 seen. c: its centre; r: its radius.
fn sphereSeen(c: vec3f, r: f32) -> u32 {
  let p = (view.view * vec4f(c + view.shift.xyz, 1.0)).xyz;
  let away = -p.z - r;
  if (away > view.more.x) { return 0u; }
  // Near the eye or behind it, it has no place on screen to test.
  if (!isOrthographic(view.projection) && away < 2.0 * view.shift.w) { return 2u; }
  var lo = vec2f(1e30);
  var hi = vec2f(-1e30);
  for (var k = 0u; k < 8u; k++) {
    let q = texelOf(p + select(vec3f(-r), vec3f(r), vec3<bool>((k & 1u) != 0u, (k & 2u) != 0u, (k & 4u) != 0u)));
    lo = min(lo, q);
    hi = max(hi, q);
  }
  if (hi.x < 0.0 || hi.y < 0.0 || lo.x >= view.vp.z || lo.y >= view.vp.w) { return 0u; }
  let a = clamp(lo, vec2f(0.0), view.vp.zw - 1.0);
  let b = clamp(hi, vec2f(0.0), view.vp.zw - 1.0);
  let m = u32(clamp(ceil(log2(max(max(b.x - a.x, b.y - a.y), 1.0))), 0.0, f32(view.counts.x)));
  let t0 = vec2i(a) >> vec2u(m);
  let t1 = vec2i(b) >> vec2u(m);
  var far = 0.0;
  for (var y = t0.y; y <= t1.y; y++) {
    for (var x = t0.x; x <= t1.x; x++) { far = max(far, farthest(vec2i(x, y), m)); }
  }
  let near = nearer(away);
  if (near <= far) { return 2u; }
  return select(0u, 1u, near - ${KEEP_UM} <= far);
}

// Dispatched over two dimensions where the somas need more workgroups than one dimension allows.
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u, @builtin(num_workgroups) n: vec3u) {
  let i = id.y * n.x * 64u + id.x;
  if (i >= view.counts.w) { return; }
  if (textureLoad(cells, cellXY(i), 0).a == 0.0) { return; }
  let v = sphereSeen(vec3f(positions[3u * i], positions[3u * i + 1u], positions[3u * i + 2u]), view.more.w);
  if (v == 0u) { return; }
  kept[atomicAdd(&draws.kept.instances, 1u)] = i;
  if (v == 2u) { seen[atomicAdd(&draws.seen.instances, 1u)] = i; }
}
`;
