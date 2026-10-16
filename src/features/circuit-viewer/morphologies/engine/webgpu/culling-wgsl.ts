/**
 * The culling's passes, the bench's (`docs/circuit-morphology-bench/src/cull/wgsl.js`) on the arena's segments and in
 * µm from the eye, so that the same holds in perspective. Each pass is put together with the impostors' own WGSL
 * (`culling.ts`), whose `segmentEnds` places a segment as its draw does.
 */

import { QUAD_REACH } from '../impostors';

/** How much nearer a segment is taken to be than it is, µm and a share of its distance: the arithmetic's rounding. */
export const NEAR_UM = 0.02;
export const NEAR_SHARE = 1e-6;
/** How far behind what hides it a segment is still kept, µm, to hide others the next frame: the bench's. */
export const KEEP_UM = 10;
/**
 * The texels a side a block's box is tested on, and the rows a segment is walked over pixel by pixel; past them, a
 * coarser level of the pyramid. The bench's: 4 rows was the fastest while the whole brain turned.
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
  // x: the far plane's distance; y: the least radius of a tube, px; z: the least radius of any, px.
  more: vec4f,
  // x: the pyramid's levels; y: the blocks; z: the arena's capacity.
  counts: vec4u,
}
@group(0) @binding(0) var<uniform> view: View;

// A view point in device pixels from the top left, y down, as the fragment's position counts them.
fn texelOf(p: vec3f) -> vec2f {
  return toFragment(pixelsUp(p, view.projection, view.vp), view.vp);
}
fn nearer(away: f32) -> f32 { return away - away * ${NEAR_SHARE} - ${NEAR_UM}; }
`;

const FARTHEST = /* wgsl */ `
// The farthest drawn under texel p of level m, µm from the eye; level 0 is the picture's own.
fn farthest(p: vec2i, m: u32) -> f32 {
  if (m == 0u) { return textureLoad(full, p, 0).x; }
  let l = i32(m) - 1;
  return textureLoad(hiz, min(p, vec2i(textureDimensions(hiz, l)) - 1), l).x;
}
`;

const BLOCK = /* wgsl */ `
struct Block { lo: vec3f, first: u32, hi: vec3f, count: u32 }
`;

/**
 * The depth drawn before the tests, at each pixel the farthest of its samples, in µm from the eye: a few of the depth
 * buffer's steps farther, for what turning it back loses.
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
 * The pyramid: each level the farthest of the 2 × 2 texels under it, and of a third where a side is odd, so that a
 * texel never says nearer than any pixel it stands for.
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
 * A block is up to 64 segments of a box. One whose box may show, or hide by no more than \`KEEP_UM\`, is handed on for
 * the next pass to test its segments one by one. The box is widened by the least radius a segment is drawn with.
 */
export const BLOCKS = /* wgsl */ `
${VIEW}${BLOCK}${FARTHEST}
struct Counters { blocks: atomic<u32>, candidates: atomic<u32>, pad: vec2u }
@group(0) @binding(1) var<storage, read> blocks: array<Block>;
@group(0) @binding(2) var full: texture_2d<f32>;
@group(0) @binding(3) var hiz: texture_2d<f32>;
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

/** The blocks handed on as the size of the next pass: 512 workgroups a row. */
export const ARGS = /* wgsl */ `
@group(0) @binding(0) var<storage, read> counters: array<u32>;
@group(0) @binding(1) var<storage, read_write> dispatch: array<u32>;
@compute @workgroup_size(1) fn main() {
  dispatch[0] = 512u;
  dispatch[1] = (counters[0] + 511u) / 512u;
  dispatch[2] = 1u;
}
`;

/**
 * Each segment of the blocks handed on, against the farthest drawn before it: first the whole of it against the 2 × 2
 * texels of the level that holds it, then, where that leaves it open, texel by texel along it. It is taken at its
 * nearest all along, the nearest of its ends less its radius, which neither its flat quad nor its tube is nearer than,
 * and as wide as its quad. Those seen go on the seen list, those hidden by no more than \`KEEP_UM\` and those seen on the
 * kept list, which the next frame draws to depth before its tests: when the view moves, what was seen parts in thin
 * cracks, and with nothing behind them every block would show through one. A segment as wide on screen as a tube
 * (\`GpuUniforms.tubeFrom\`) goes on the lists' tubes. The lists are as long as the arena, which no frame can overfill.
 */
export const SEGMENTS = /* wgsl */ `
${VIEW}${BLOCK}${FARTHEST}
struct Args { indices: u32, instances: atomic<u32>, firstIndex: u32, baseVertex: u32, firstInstance: u32 }
struct Draws { keptFlat: Args, keptTubes: Args, seenFlat: Args, seenTubes: Args }
@group(0) @binding(1) var<storage, read> blocks: array<Block>;
@group(0) @binding(2) var full: texture_2d<f32>;
@group(0) @binding(3) var hiz: texture_2d<f32>;
@group(0) @binding(4) var<storage, read> passed: array<u32>;
@group(0) @binding(5) var<storage, read> counters: array<u32>;
@group(0) @binding(6) var<storage, read> ends: array<vec4f>;
@group(0) @binding(7) var<storage, read> words: array<u32>;
@group(0) @binding(8) var<storage, read_write> lists: array<u32>;
@group(0) @binding(9) var<storage, read_write> draws: Draws;

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

  // Row by row along the way it runs most, on the level where that is few enough rows. On the picture's own level a
  // pixel counts where its centre is on the segment, as it is drawn; on a coarser one a texel counts wherever it may
  // touch it.
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

@compute @workgroup_size(64) fn main(@builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_index) lid: u32) {
  let g = wid.y * 512u + wid.x;
  if (g >= counters[0]) { return; }
  let bl = blocks[passed[g]];
  if (lid >= bl.count) { return; }
  let i = bl.first + lid;
  let A = ends[2u * i];
  let B = ends[2u * i + 1u];
  let e = segmentEnds(words[i], 1.0, view.more.z, A, B, A, B, 0.0, view.shift.xyz, view.view, view.projection,
                      view.vp, view.shift.w);
  // A hole, or behind the eye.
  if (e[3].w < 0.5) { return; }
  let radii = e[2].xy;
  let near = nearer(min(-e[0].z - e[0].w, -e[1].z - e[1].w));
  let v = seen(texelOf(e[0].xyz), texelOf(e[1].xyz), ${QUAD_REACH} * max(radii.x, radii.y), near);
  if (v < 3u) { return; }
  let tube = max(radii.x, radii.y) >= view.more.y;
  let cap = view.counts.z;
  if (tube) {
    lists[cap - 1u - atomicAdd(&draws.keptTubes.instances, 1u)] = i;
  } else {
    lists[atomicAdd(&draws.keptFlat.instances, 1u)] = i;
  }
  if (v != 3u) { return; }
  if (tube) {
    lists[2u * cap - 1u - atomicAdd(&draws.seenTubes.instances, 1u)] = i;
  } else {
    lists[cap + atomicAdd(&draws.seenFlat.instances, 1u)] = i;
  }
}
`;
