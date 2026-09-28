/**
 * Slab meshing on the GPU (WebGPU compute): the field, and optionally the
 * surface extraction, the projection onto the field and the simplification's
 * checks as well.
 *
 * The CPU field scatters: every segment writes into the samples of its band.
 * A compute shader gathers instead: the blocks a slab needs and, per block, the
 * list of segments whose band reaches it are worked out here on the CPU
 * (`binSegments`), and one shader invocation per sample row walks its block's
 * list. The list is in section order, family by family, so the invocation
 * keeps the minimum normalised distance within the current section (the
 * soma's smooth one, folded in segment order), adds the kernel to the
 * family's sum when the section changes, and takes the maximum with the field
 * when the family does, as `splatSegment` + `flushSection` + `mergeFamily` do.
 *
 * Consistency. The mesher relies on a sample having the same value wherever it
 * is computed: boundary samples are duplicated between neighbouring blocks, and
 * slabs share the sample planes along their cuts. Here a sample's value depends
 * only on its global integer coordinates and on the segments whose integer
 * sample box contains it (the same box `splatSegment` loops over), evaluated by
 * the same shader code in the same order. Which block or slab asks does not
 * enter. CPU and GPU values differ in the last bits (f32 against f64
 * arithmetic), so a build must use one backend for all of its slabs.
 *
 * Precision. WGSL has no f64. Positions are in voxel units and a segment's
 * start is stored as an integer sample plus a fraction in [0, 1), so the
 * sample-to-segment offset is an exact integer difference minus that fraction:
 * its error is relative to the band width, not to the cell's extent.
 *
 * Readback, field only ("gpu-field"). Only blocks the surface crosses come
 * back. The field pass also ORs every row's inside mask (and its complement)
 * into one word per block; those words are read first, then a second pass packs
 * the crossing blocks into a buffer that is mapped for the CPU extraction to
 * read in place.
 *
 * Extraction ("gpu"). Surface nets emit a varying number of vertices per cell
 * and quads per sample row, so the output has to be laid out before it is
 * written. A count pass walks every crossing block and leaves, per cell and per
 * row, the running totals inside the block, and per block its vertex and quad
 * counts. Those counts are read back (they replace the crossing words above),
 * summed into per-block offsets here, and two more passes write the vertices
 * and the faces, which look their four cells' vertices up through the offsets,
 * in neighbouring blocks where needed. The vertices are projected there too
 * (PROJECT_WGSL) and come back with their field normals and radii; the
 * simplification runs on the worker and sends its triangles back to be checked
 * (CHECK_WGSL, `completeSlabAsync`); shading normals and stitching stay on the
 * CPU. This needs a slab's blocks resident at once; a slab too large for that
 * falls back to the field-only path, which works in batches.
 */

import { bandHalfWidth, SOMA_FADE } from './field';
import {
  B,
  B3,
  type Block,
  BS,
  BS3,
  blockKey,
  CLOSENESS_STEPS,
  COMP,
  CORNER_OFF,
  CROSSING_MARGIN,
  completeSlabAsync,
  EDGE_C0,
  EDGE_C1,
  finishSlab,
  type GpuFieldStats,
  NCOMP,
  ROOTS,
  ROW_FULL,
  ROWS,
  type Seam,
  SegmentBand,
  type SlabJob,
  type SlabResult,
  type SlabSurface,
  seamKey,
  slabClip,
  XCOUNT,
  XEDGE,
  XROOT,
} from './mesher';
import { errorMessage, GpuError } from './protocol';
import {
  MAX_RADIUS_FRACTION,
  MAX_SAMPLE_DIVISIONS,
  MIN_GRADIENT2,
  NO_GRADIENT_OFF,
  type OffSurfaceCheck,
  PROJECT_DONE,
  PROJECT_MAX_MOVE,
  PROJECT_MAX_STEP,
  PROJECT_STEPS,
  SAMPLE_SPACING,
  UNDECIDED,
} from './refine';
import { CELL_HASH_PRIMES, cellHash } from './segments';

/** How much of a slab the GPU does: the field only, or also the extraction, the projection and the checks. */
export type GpuMode = 'gpu-field' | 'gpu';

/** Words per block in the field output: 9³ sample values, then three words per sample row (see Block.packed). */
const BLOCK_WORDS = BS3 + 3 * ROWS;
const BLOCK_BYTES = 4 * BLOCK_WORDS;
/** Bytes per segment record, `Seg` in the shader. */
export const SEG_BYTES = 96;
/** Upper bound on the field output of one dispatch; larger slabs go through in batches. */
const MAX_BATCH_BYTES = 1 << 28;
const MAX_DISPATCH = 65535;
/** Buffers are allocated this much larger than asked for, so that the next slab, a little larger, fits. */
const HEADROOM = 1.25;
/** Invocations per workgroup of the one-dimensional passes. */
const WG = 64;
/** Words per block of running totals from the count pass: vertices before each cell, quads before each cell row. */
const LOCAL_WORDS = B3 + B * B;
/** Words per block of `BlockInfo` in the extraction shaders. */
const INFO_WORDS = 20;
const NONE = 0xffffffff;
/** Words per vertex in the point buffer the vertex pass leaves for the projection: integer voxel, then fraction. */
const POINT_WORDS = 6;
/** Floats per vertex the projection leaves: the unit field normal, then the radius of the closest section (µm). */
const SHADING_WORDS = 4;

/**
 * Fewest simplified triangles worth a round trip to the device for their check; fewer are sampled on the worker. A
 * triangle of a patch at the default voxel takes the worker about 5 µs (a triangle spans many voxels, so up to 88
 * check points), a round trip with twelve workers at the device about a millisecond: 256 came out ahead of 2048 on
 * the sample cell, where most patches have a few hundred triangles to check.
 */
const GPU_CHECK_MIN_TRIANGLES = 256;

/** Bytes of the `Query` uniform: five words, padded as a uniform struct is. */
const QUERY_BYTES = 32;

/** The data of the `Query` uniform for `count` points or triangles of a slab, with the tolerance in voxels. */
function queryData(count: number, hashMask: number, h: number, tolerance: number): ArrayBuffer {
  const query = new ArrayBuffer(QUERY_BYTES);
  new Uint32Array(query, 0, 2).set([count, hashMask]);
  new Float32Array(query, 8, 3).set([h, MIN_GRADIENT2 * h * h, tolerance / h]);
  return query;
}

// Offsets of the per-corner-mask tables (see the cell tables in mesher.ts) inside one array<u32>.
const T_NCOMP = 0;
const T_XCOUNT = 256;
const T_ROOTS = 512;
const T_COMP = T_ROOTS + 256 * 8;
/** Position of a corner's component among the mask's components, which is its vertex's offset within the cell. */
const T_RANK = T_COMP + 256 * 8;
const T_XEDGE = T_RANK + 256 * 8;
const T_XROOT = T_XEDGE + 256 * 12;
const TABLE_WORDS = T_XROOT + 256 * 12;

function cellTables(): Uint32Array {
  const t = new Uint32Array(TABLE_WORDS);
  // Past a mask's count mesher.ts's tables hold zeros, as the shaders want them.
  t.set(NCOMP, T_NCOMP);
  t.set(XCOUNT, T_XCOUNT);
  t.set(ROOTS, T_ROOTS);
  t.set(XEDGE, T_XEDGE);
  t.set(XROOT, T_XROOT);
  for (let mask = 0; mask < 256; mask++) {
    for (let c = 0; c < 8; c++) {
      const root = COMP[mask * 8 + c];
      t[T_COMP + mask * 8 + c] = root < 0 ? 0 : root;
      let rank = 0;
      for (let n = 0; n < NCOMP[mask]; n++) if (ROOTS[mask * 8 + n] === root) rank = n;
      t[T_RANK + mask * 8 + c] = rank;
    }
  }
  return t;
}

// GPUBufferUsage and GPUMapMode bits. TypeScript's DOM library types WebGPU but leaves these two objects out.
const MAP_READ = 0x0001;
const COPY_SRC = 0x0004;
const COPY_DST = 0x0008;
const UNIFORM = 0x0040;
const STORAGE = 0x0080;
const MAP_MODE_READ = 0x0001;

/**
 * The errors a readback checks for, in the order it reports them: a buffer the device could not allocate, or an
 * internal failure, leaves an invalid object behind, and whatever uses it then fails validation.
 */
const ERROR_FILTERS: GPUErrorFilter[] = ['out-of-memory', 'internal', 'validation'];

/**
 * A map that has not come back within `KICK_AFTER_MS` gets an empty submission every `KICK_EVERY_MS` until it has.
 * Firefox finishes a map only when it polls the device, which it does every 100 ms or when something is submitted
 * (Bugzilla 1870699): a GPU build of the sample cell took 5.2 s there, most of it waiting, and takes 0.3 s with the
 * kicks. Chrome and Safari map within about a millisecond, before the first is due. Not in a tight loop: that floods
 * Chrome's GPU process, and every worker's maps slow to 100 ms.
 */
const KICK_AFTER_MS = 2;
const KICK_EVERY_MS = 1;

/** The segment record and the kernel, shared by the field pass and the point query. */
const SEG_WGSL = /* wgsl */ `
struct Seg {
  ia: vec3<i32>, ra: f32,
  fa: vec3<f32>, dr: f32,
  ab: vec3<f32>, invLen2: f32,
  lo: vec3<i32>, beta: f32,
  hi: vec3<i32>, secType: u32,
  family: u32,
  // Width of the smooth minimum the section's segments fold by (primRound in mesher.ts); 0 for the plain one.
  round: f32,
}

const FAR = 1e30;
// Sentinels for the round that closes the last section and its family; a section or family index never reaches them.
const NO_SECTION = 0xfffffffeu;
const UNSET = 0xffffffffu;

// 1 - u inside (clamped), (1 - u/2)² outside; the caller guarantees u < 2.
fn kernel(u: f32) -> f32 {
  if (u < 0.0) { return 1.0 - max(u, -2.0); }
  let q = 1.0 - 0.5 * u;
  return q * q;
}

// g'(u), for u < 2 as above.
fn kernelSlope(u: f32) -> f32 {
  if (u < 0.0) { return select(-1.0, 0.0, u < -2.0); }
  return 0.5 * u - 1.0;
}

// The share a soma part at the normalised distance u has in the rounding, fading out before its band ends (somaFade in
// field.ts), and its slope.
fn somaFade(u: f32) -> f32 {
  let s = clamp((2.0 - u) / f32(${SOMA_FADE}), 0.0, 1.0);
  return s * s * (3.0 - 2.0 * s);
}
fn somaFadeSlope(u: f32) -> f32 {
  let s = clamp((2.0 - u) / f32(${SOMA_FADE}), 0.0, 1.0);
  return -6.0 * s * (1.0 - s) / f32(${SOMA_FADE});
}

// The smooth minimum of a and b over the width k (smoothMin in field.ts).
fn smoothMin(a: f32, b: f32, k: f32) -> f32 {
  let q = max(0.0, 1.0 - abs(a - b) / k);
  return min(a, b) - 0.25 * k * q * q * somaFade(a) * somaFade(b);
}
`;

const FIELD_WGSL = /* wgsl */ `
${SEG_WGSL}
struct Batch { base: u32, count: u32 }

@group(0) @binding(0) var<uniform> batch: Batch;
@group(0) @binding(1) var<storage, read> segs: array<Seg>;
// xyz: global sample coordinates of the block's first sample, w: start of its list. One extra entry closes the last list.
@group(0) @binding(2) var<storage, read> blocks: array<vec4<i32>>;
@group(0) @binding(3) var<storage, read> lists: array<u32>;
@group(0) @binding(4) var<storage, read_write> field: array<u32>;
@group(0) @binding(5) var<storage, read_write> flags: array<atomic<u32>>;

// One invocation per sample row: local x is the row's y, local y its z.
@compute @workgroup_size(${BS}, ${BS}, 1)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  if (wg.x >= batch.count) { return; }
  let b = batch.base + wg.x;
  let blk = blocks[b];
  let first = u32(blk.w);
  let last = u32(blocks[b + 1u].w);
  let gx0 = blk.x;
  let gy = blk.y + i32(lid.x);
  let gz = blk.z + i32(lid.y);

  // The field is the largest of the families' sums: acc has it for the families gone through, sum is the current one's.
  var acc: array<f32, ${BS}>;
  var sum: array<f32, ${BS}>;
  var uMin: array<f32, ${BS}>;
  var bestQ: array<i32, ${BS}>;
  var bestType: array<u32, ${BS}>;
  for (var i = 0; i < ${BS}; i++) {
    acc[i] = 0.0;
    sum[i] = 0.0;
    uMin[i] = FAR;
    bestQ[i] = 1 << 20;
    bestType[i] = 0u;
  }

  var section = UNSET;
  var sectionType = 0u;
  var family = UNSET;
  var dirty = false;
  var summed = false;
  for (var n = first; n <= last; n++) {
    // The extra round at n == last closes the final section, and its family.
    var next = NO_SECTION;
    var nextFamily = NO_SECTION;
    if (n < last) {
      next = segs[lists[n]].secType >> 8u;
      nextFamily = segs[lists[n]].family;
    }
    if (next != section) {
      if (dirty) {
        summed = true;
        for (var i = 0; i < ${BS}; i++) {
          let u = uMin[i];
          if (u < 2.0) {
            sum[i] += kernel(u);
            // Quantised like the CPU's closeness byte; the first section to come closest keeps the sample's type.
            let q = max(0, i32((u + 2.0) * ${CLOSENESS_STEPS}.0));
            if (q < bestQ[i]) {
              bestQ[i] = q;
              bestType[i] = sectionType;
            }
          }
          uMin[i] = FAR;
        }
        dirty = false;
      }
      section = next;
      if (nextFamily != family) {
        if (summed) {
          for (var i = 0; i < ${BS}; i++) {
            acc[i] = max(acc[i], sum[i]);
            sum[i] = 0.0;
          }
          summed = false;
        }
        family = nextFamily;
      }
    }
    if (n == last) { break; }

    let s = segs[lists[n]];
    sectionType = s.secType & 0xffu;
    if (gy < s.lo.y || gy > s.hi.y || gz < s.lo.z || gz > s.hi.z) { continue; }
    let x0 = max(s.lo.x, gx0);
    let x1 = min(s.hi.x, gx0 + ${B});
    let dy = f32(gy - s.ia.y) - s.fa.y;
    let dz = f32(gz - s.ia.z) - s.fa.z;
    let dotYZ = dy * s.ab.y + dz * s.ab.z;
    for (var gx = x0; gx <= x1; gx++) {
      let dx = f32(gx - s.ia.x) - s.fa.x;
      let t = clamp((dx * s.ab.x + dotYZ) * s.invLen2, 0.0, 1.0);
      let cx = dx - s.ab.x * t;
      let cy = dy - s.ab.y * t;
      let cz = dz - s.ab.z * t;
      let dist2 = cx * cx + cy * cy + cz * cz;
      let r = s.ra + s.dr * t;
      let scale = max(s.beta * r, 1.0);
      let lim = r + 2.0 * scale;
      if (dist2 < lim * lim) {
        let u = (sqrt(dist2) - r) / scale;
        let i = gx - gx0;
        if (s.round > 0.0) {
          // The soma's parts fold by a smooth minimum; the first, into FAR, is its own distance.
          uMin[i] = smoothMin(uMin[i], u, s.round);
          dirty = true;
        } else if (u < uMin[i]) {
          uMin[i] = u;
          dirty = true;
        }
      }
    }
  }

  let row = lid.y * ${BS}u + lid.x;
  let o = wg.x * ${BLOCK_WORDS}u;
  var mask = 0u;
  for (var i = 0u; i < ${BS}u; i++) {
    field[o + row * ${BS}u + i] = bitcast<u32>(acc[i]);
    if (acc[i] > 1.0) { mask |= 1u << i; }
  }
  let m = o + ${BS3}u + 3u * row;
  field[m] = bestType[0] | (bestType[1] << 8u) | (bestType[2] << 16u) | (bestType[3] << 24u);
  field[m + 1u] = bestType[4] | (bestType[5] << 8u) | (bestType[6] << 16u) | (bestType[7] << 24u);
  field[m + 2u] = bestType[8] | (mask << 8u);
  // Low bits: some sample inside. High bits: some sample outside. The surface crosses the block when both are set.
  atomicOr(&flags[wg.x], mask | ((~mask & ${ROW_FULL}u) << ${BS}u));
}
`;

const GATHER_WGSL = /* wgsl */ `
@group(0) @binding(0) var<storage, read> field: array<u32>;
@group(0) @binding(1) var<storage, read> crossing: array<u32>;
@group(0) @binding(2) var<storage, read_write> packed: array<u32>;

// One invocation per sample row of a crossing block.
@compute @workgroup_size(${ROWS})
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) row: u32) {
  if (wg.x >= arrayLength(&crossing)) { return; }
  let src = crossing[wg.x] * ${BLOCK_WORDS}u;
  let dst = wg.x * ${BLOCK_WORDS}u;
  for (var i = 0u; i < ${BS}u; i++) {
    packed[dst + row * ${BS}u + i] = field[src + row * ${BS}u + i];
  }
  for (var i = 0u; i < 3u; i++) {
    packed[dst + ${BS3}u + 3u * row + i] = field[src + ${BS3}u + 3u * row + i];
  }
}
`;

/**
 * The field at an arbitrary point, as `FieldSampler.sample`: the largest of the families' sums of the kernel of each
 * section's least normalised distance, with its gradient.
 *
 * The segments that can reach a point are those of the block it falls in, which `binSegments` has already worked out
 * for the field pass, found through its hash table. That list is the segments whose integer sample box touches the
 * block rather than those whose band reaches the point exactly, as `FieldSampler.fineList` has it. The two differ
 * only where the band's bounding box ends, and a point there is a band away from the axis, where the kernel and its
 * slope are both zero: what the list leaves out contributes nothing.
 *
 * A point is an integer voxel plus a fraction, as a segment's start is, so the offset between them is an exact
 * integer difference plus a difference of fractions and its error does not grow with the cell's extent. The gradient
 * comes out in voxel units, h times the field's gradient in µm, which is what the Newton steps below want.
 */
const QUERY_WGSL = /* wgsl */ `
// tol: the simplification's tolerance in voxels, for the check.
struct Query { count: u32, hashMask: u32, h: f32, minG2: f32, tol: f32 }

@group(0) @binding(0) var<uniform> qu: Query;
@group(0) @binding(1) var<storage, read> segs: array<Seg>;
@group(0) @binding(2) var<storage, read> blocks: array<vec4<i32>>;
@group(0) @binding(3) var<storage, read> lists: array<u32>;
@group(0) @binding(4) var<storage, read> hashTable: array<i32>;

const NO_BLOCK = 0xffffffffu;

struct Q { F: f32, g: vec3<f32>, radius: f32 }

// A point of the projection and the check, \`points\`: the integer voxel, then the fraction.
fn pointInt(v: u32) -> vec3<i32> {
  let o = ${POINT_WORDS}u * v;
  return vec3<i32>(bitcast<i32>(points[o]), bitcast<i32>(points[o + 1u]), bitcast<i32>(points[o + 2u]));
}
fn pointFrac(v: u32) -> vec3<f32> {
  let o = ${POINT_WORDS}u * v;
  return vec3<f32>(bitcast<f32>(points[o + 3u]), bitcast<f32>(points[o + 4u]), bitcast<f32>(points[o + 5u]));
}

fn floorDivB(v: i32) -> i32 {
  if (v >= 0) { return v / ${B}; }
  return -((${B - 1} - v) / ${B});
}

fn blockAt(b: vec3<i32>) -> u32 {
  var at = ((u32(b.x) * ${CELL_HASH_PRIMES[0]}u) ^ (u32(b.y) * ${CELL_HASH_PRIMES[1]}u) ^ (u32(b.z) * ${CELL_HASH_PRIMES[2]}u)) & qu.hashMask;
  // The table is at most half full, so an absent block meets an empty slot; the bound only keeps the loop finite.
  for (var n = 0u; n <= qu.hashMask; n++) {
    let e = hashTable[at];
    if (e < 0) { return NO_BLOCK; }
    let blk = blocks[u32(e)];
    if (blk.x == b.x * ${B} && blk.y == b.y * ${B} && blk.z == b.z * ${B}) { return u32(e); }
    at = (at + 1u) & qu.hashMask;
  }
  return NO_BLOCK;
}

// A point outside every block the slab was given comes back with a radius of -1: the caller leaves that vertex to
// the CPU rather than pretending the field is zero there.
fn sampleField(iv: vec3<i32>, fr: vec3<f32>) -> Q {
  var out: Q;
  out.F = 0.0;
  out.g = vec3<f32>(0.0, 0.0, 0.0);
  out.radius = 0.0;

  // The steps move the fraction out of [0, 1): carry it into the integer part before looking the block up.
  let carry = vec3<i32>(floor(fr));
  let ip = iv + carry;
  let fp = fr - vec3<f32>(carry);
  let b = blockAt(vec3<i32>(floorDivB(ip.x), floorDivB(ip.y), floorDivB(ip.z)));
  if (b == NO_BLOCK) {
    out.radius = -1.0;
    return out;
  }
  let first = u32(blocks[b].w);
  let last = u32(blocks[b + 1u].w);

  // The field is the largest of the families' sums (F, G); fF and fG are the current family's, and mu the least
  // normalised distance of the current section with the gradient of u at it.
  var F = 0.0;
  var G = vec3<f32>(0.0, 0.0, 0.0);
  var closest = FAR;
  var radius = 0.0;
  var family = UNSET;
  var fF = 0.0;
  var fG = vec3<f32>(0.0, 0.0, 0.0);
  var section = UNSET;
  var mu = FAR;
  var mg = vec3<f32>(0.0, 0.0, 0.0);
  var mr = 0.0;

  for (var n = first; n <= last; n++) {
    // The extra round at n == last closes the final section, and its family.
    var next = NO_SECTION;
    var nextFamily = NO_SECTION;
    var si = 0u;
    if (n < last) {
      si = lists[n];
      next = segs[si].secType >> 8u;
      nextFamily = segs[si].family;
    }
    if (next != section) {
      if (mu < 2.0) {
        fF += kernel(mu);
        fG += kernelSlope(mu) * mg;
        if (mu < closest) { closest = mu; radius = mr; }
      }
      if (nextFamily != family) {
        if (fF > F) { F = fF; G = fG; }
        family = nextFamily;
        fF = 0.0;
        fG = vec3<f32>(0.0, 0.0, 0.0);
      }
      if (n == last) { break; }
      section = next;
      mu = FAR;
    }

    let s = segs[si];
    let d = vec3<f32>(ip - s.ia) + (fp - s.fa);
    var t = dot(d, s.ab) * s.invLen2;
    var taper = s.dr * s.invLen2;
    if (t < 0.0) { t = 0.0; taper = 0.0; } else if (t > 1.0) { t = 1.0; taper = 0.0; }
    let e = d - s.ab * t;
    let dist2 = dot(e, e);
    let r = s.ra + s.dr * t;
    let scale = max(s.beta * r, 1.0);
    let lim = r + 2.0 * scale;
    if (dist2 >= lim * lim) { continue; }
    let dist = sqrt(dist2);
    let u = (dist - r) / scale;
    if (s.round > 0.0) {
      // The soma's fold, as the field pass has it, with the gradient mixed by the fold's slopes: 1 - q/2 towards the
      // smaller of the two, q/2 towards the larger, and the fades' (somaFade).
      var inv = 0.0;
      if (dist > 1e-12) { inv = 1.0 / (dist * scale); }
      let k = s.round;
      let q = max(0.0, 1.0 - abs(mu - u) / k);
      let fadeOwn = somaFade(u);
      let fadeKept = somaFade(mu);
      let lift = 0.25 * k * q * q;
      var own = 0.5 * q * fadeOwn * fadeKept;
      if (u < mu) {
        own = 1.0 - own;
        mr = r;
      }
      let kept = 1.0 - own - lift * fadeOwn * somaFadeSlope(mu);
      let mine = own - lift * fadeKept * somaFadeSlope(u);
      mg = kept * mg + mine * (e * inv - (taper / scale) * s.ab);
      mu = min(mu, u) - lift * fadeOwn * fadeKept;
    } else if (u < mu) {
      mu = u;
      mr = r;
      // Grad u = (grad dist - grad r) / scale: off the axis, tilted by the cone's taper between its ends.
      var inv = 0.0;
      if (dist > 1e-12) { inv = 1.0 / (dist * scale); }
      mg = e * inv - (taper / scale) * s.ab;
    }
  }
  out.F = F;
  out.g = G;
  out.radius = radius;
  return out;
}
`;

/**
 * Move every vertex onto F = 1 with the Newton steps of `projectVertices` and leave the field normal and the radius
 * of the closest section there. The vertex pass wrote each vertex as the integer voxel of its cell plus the
 * fraction of its edge crossings; only the displacement goes onto the position, so the part of it that the vertex
 * pass worked out stays as it was. A vertex whose gradient vanishes keeps its place and gets no normal (zero), for
 * `fillBlankNormals` to give the faces' one, as `projectVertices` does.
 */
const PROJECT_WGSL = /* wgsl */ `
${SEG_WGSL}
${QUERY_WGSL}
@group(0) @binding(5) var<storage, read_write> points: array<u32>;
@group(0) @binding(6) var<storage, read_write> positions: array<f32>;
@group(0) @binding(7) var<storage, read_write> shading: array<f32>;

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let v = gid.x;
  if (v >= qu.count) { return; }
  let o = ${POINT_WORDS}u * v;
  let iv = pointInt(v);
  let f0 = pointFrac(v);

  var f = f0;
  var q = sampleField(iv, f);
  var missed = q.radius < 0.0;
  let firstOff = abs(q.F - 1.0);
  for (var step = 0; ; step++) {
    if (missed) { break; }
    let off = q.F - 1.0;
    let g2 = dot(q.g, q.g);
    if (step == ${PROJECT_STEPS} || g2 < qu.minG2 || abs(off) < ${PROJECT_DONE}) { break; }
    var k = -off / g2;
    let len = abs(k) * sqrt(g2);
    if (len > ${PROJECT_MAX_STEP}) { k *= ${PROJECT_MAX_STEP} / len; }
    f += k * q.g;
    let moved = f - f0;
    let far = length(moved);
    if (far > ${PROJECT_MAX_MOVE}) {
      f = f0 + moved * (${PROJECT_MAX_MOVE} / far);
      step = ${PROJECT_STEPS - 1};
    }
    q = sampleField(iv, f);
    missed = missed || q.radius < 0.0;
  }
  if (missed) {
    f = f0;
  } else if (abs(q.F - 1.0) > firstOff) {
    // The steps made it worse (a saddle between two sheets): stay.
    f = f0;
    q = sampleField(iv, f);
  }

  let d = (f - f0) * qu.h;
  positions[3u * v] += d.x;
  positions[3u * v + 1u] += d.y;
  positions[3u * v + 2u] += d.z;
  // The check of the simplified triangles (CHECK_WGSL) samples between the projected vertices.
  points[o + 3u] = bitcast<u32>(f.x);
  points[o + 4u] = bitcast<u32>(f.y);
  points[o + 5u] = bitcast<u32>(f.z);
  let g2 = dot(q.g, q.g);
  var nrm = vec3<f32>(0.0, 0.0, 0.0);
  if (!missed && g2 >= qu.minG2) { nrm = q.g * (-1.0 / sqrt(g2)); }
  let w = ${SHADING_WORDS}u * v;
  shading[w] = nrm.x;
  shading[w + 1u] = nrm.y;
  shading[w + 2u] = nrm.z;
  shading[w + 3u] = select(q.radius * qu.h, -1.0, missed);
}
`;

/**
 * Whether a simplified triangle leaves the isosurface, as `offSurface` in refine.ts decides it: the same lattice of
 * check points a voxel apart, the same first-order distance |F - 1| / |grad F| against the tolerance or half the
 * local radius. One invocation per triangle, between the projected vertices that the projection left in `points`,
 * taken relative to the first of them so that the points keep the precision of the vertices. A point outside every
 * block the slab was given leaves the triangle undecided, for the worker to sample.
 */
const CHECK_WGSL = /* wgsl */ `
${SEG_WGSL}
${QUERY_WGSL}
@group(0) @binding(5) var<storage, read> points: array<u32>;
@group(0) @binding(6) var<storage, read> tris: array<u32>;
@group(0) @binding(7) var<storage, read_write> verdicts: array<u32>;

const UNDECIDED = ${UNDECIDED}u;

// Distance of a point from F = 1 over the distance allowed there; above 1 the point is off the surface, and it is
// negative where the point lies outside the blocks.
fn deviation(iv: vec3<i32>, fr: vec3<f32>) -> f32 {
  let q = sampleField(iv, fr);
  if (q.radius < 0.0) { return -1.0; }
  let off = abs(q.F - 1.0);
  let g2 = dot(q.g, q.g);
  // No gradient: outside every band (F = 0) or deeper than the kernel's clamp (F = 3).
  if (g2 < qu.minG2) { return select(0.0, 2.0, off > ${NO_GRADIENT_OFF}); }
  let allowed = min(qu.tol, ${MAX_RADIUS_FRACTION} * q.radius);
  if (allowed <= 0.0) { return select(0.0, 2.0, off > 0.0); }
  return off / sqrt(g2) / allowed;
}

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let t = gid.x;
  if (t >= qu.count) { return; }
  let a = tris[3u * t];
  let b = tris[3u * t + 1u];
  let c = tris[3u * t + 2u];
  let ia = pointInt(a);
  let fa = pointFrac(a);
  // The other corners from the first: an exact integer difference plus a difference of fractions, in voxels.
  let ab = vec3<f32>(pointInt(b) - ia) + (pointFrac(b) - fa);
  let ac = vec3<f32>(pointInt(c) - ia) + (pointFrac(c) - fa);
  let bc = ac - ab;
  let longest = sqrt(max(dot(ab, ab), max(dot(bc, bc), dot(ac, ac))));
  let n = max(2u, min(${MAX_SAMPLE_DIVISIONS}u, u32(ceil(longest / ${SAMPLE_SPACING.toFixed(1)}))));
  let dn = f32(n);

  // A barycentric lattice without its corners (the vertices are on the surface already); i, j, k weigh a, b, c.
  var verdict = 0u;
  for (var i = 0u; i <= n && verdict == 0u; i++) {
    for (var j = 0u; i + j <= n; j++) {
      let k = n - i - j;
      if (i == n || j == n || k == n) { continue; }
      let d = deviation(ia, fa + (f32(j) / dn) * ab + (f32(k) / dn) * ac);
      if (d < 0.0) { verdict = UNDECIDED; break; }
      if (d > 1.0) { verdict = 1u; break; }
    }
  }
  // Two divisions give the edge midpoints only: the centroid as well.
  if (verdict == 0u && n == 2u) {
    let d = deviation(ia, fa + (ab + ac) * (1.0 / 3.0));
    if (d < 0.0) { verdict = UNDECIDED; } else if (d > 1.0) { verdict = 1u; }
  }
  verdicts[t] = verdict;
}
`;

/** Shared by the extraction shaders. Cells, corners, rows and edges are numbered as in mesher.ts. */
const EXTRACT_COMMON_WGSL = /* wgsl */ `
struct Extract {
  count: u32,
  // The axis the slabs are cut along, and the first sample along it that the slab owns: blocks below are its halo.
  axis: u32,
  ownedFrom: i32,
  h: f32,
}
struct BlockInfo {
  vertBase: u32,
  quadBase: u32,
  halo: u32,
  // Position of the block's first sample relative to the mesh centre, µm.
  origin: vec3<f32>,
  // The block itself, then its neighbours on the negative side: bit 0 for x, 1 for y, 2 for z. ${NONE}u where there is none.
  nb: array<u32, 8>,
  // Global sample coordinates of the block's first sample.
  first: vec3<i32>,
}

const NONE = ${NONE}u;
const CORNER_OFF = array<u32, 8>(${Array.from(CORNER_OFF).join('u, ')}u);
const EDGE_C0 = array<u32, 12>(${EDGE_C0.join('u, ')}u);
const EDGE_C1 = array<u32, 12>(${EDGE_C1.join('u, ')}u);

@group(0) @binding(0) var<uniform> ex: Extract;
@group(0) @binding(1) var<storage, read> field: array<u32>;
@group(0) @binding(2) var<storage, read> tables: array<u32>;

// Inside mask of sample row r = z * ${BS} + y of block b.
fn rowMask(b: u32, r: u32) -> u32 {
  return (field[b * ${BLOCK_WORDS}u + ${BS3}u + 3u * r + 2u] >> 8u) & ${ROW_FULL}u;
}
fn value(b: u32, sample: u32) -> f32 {
  return bitcast<f32>(field[b * ${BLOCK_WORDS}u + sample]);
}
fn sampleType(b: u32, sample: u32) -> u32 {
  let row = sample / ${BS}u;
  let x = sample - row * ${BS}u;
  return (field[b * ${BLOCK_WORDS}u + ${BS3}u + 3u * row + (x >> 2u)] >> ((x & 3u) * 8u)) & 0xffu;
}
// Corner mask of cell i of the cells between four sample rows: bit c is set where corner c = x | y << 1 | z << 2 is inside.
fn cornerMask(r00: u32, r10: u32, r01: u32, r11: u32, i: u32) -> u32 {
  return ((r00 >> i) & 3u) | (((r10 >> i) & 3u) << 2u) | (((r01 >> i) & 3u) << 4u) | (((r11 >> i) & 3u) << 6u);
}
// Corner mask of cell (i, j, k).
fn cellMask(b: u32, i: u32, j: u32, k: u32) -> u32 {
  return cornerMask(
    rowMask(b, k * ${BS}u + j), rowMask(b, k * ${BS}u + j + 1u), rowMask(b, (k + 1u) * ${BS}u + j), rowMask(b, (k + 1u) * ${BS}u + j + 1u), i);
}
// A halo block only holds valid samples in its top two planes along the cut axis: only that cell layer has vertices.
fn inLayer(halo: bool, i: u32, j: u32, k: u32) -> bool {
  if (!halo) { return true; }
  return select(select(k, j, ex.axis == 1u), i, ex.axis == 0u) == ${B - 1}u;
}
`;

/** Per block: vertices before each cell, quads before each cell row, and the block's totals. */
const COUNT_WGSL = /* wgsl */ `
${EXTRACT_COMMON_WGSL}
@group(0) @binding(3) var<storage, read> blocks: array<vec4<i32>>;
@group(0) @binding(4) var<storage, read> flags: array<u32>;
@group(0) @binding(5) var<storage, read_write> local: array<u32>;
@group(0) @binding(6) var<storage, read_write> counts: array<u32>;

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let b = gid.x;
  if (b >= ex.count) { return; }
  counts[2u * b] = 0u;
  counts[2u * b + 1u] = 0u;
  // The field pass left "some sample inside" in the low bits and "some sample outside" above them.
  if ((flags[b] & ${ROW_FULL}u) == 0u || (flags[b] >> ${BS}u) == 0u) { return; }
  let halo = blocks[b][ex.axis] < ex.ownedFrom;
  var nv = 0u;
  var nq = 0u;
  for (var k = 0u; k < ${B}u; k++) {
    for (var j = 0u; j < ${B}u; j++) {
      let r00 = rowMask(b, k * ${BS}u + j);
      let r10 = rowMask(b, k * ${BS}u + j + 1u);
      let r01 = rowMask(b, (k + 1u) * ${BS}u + j);
      let r11 = rowMask(b, (k + 1u) * ${BS}u + j + 1u);
      let row = (k * ${B}u + j);
      local[b * ${LOCAL_WORDS}u + ${B3}u + row] = nq;
      for (var i = 0u; i < ${B}u; i++) {
        local[b * ${LOCAL_WORDS}u + row * ${B}u + i] = nv;
        if (!inLayer(halo, i, j, k)) { continue; }
        let mask = cornerMask(r00, r10, r01, r11, i);
        if (mask != 0u && mask != 255u) { nv += tables[${T_NCOMP}u + mask]; }
      }
      // One quad per grid edge that changes sides; the edges start at the row's first eight samples.
      if (!halo) {
        nq += countOneBits((r00 ^ (r00 >> 1u)) & 0xffu) + countOneBits((r00 ^ r10) & 0xffu) + countOneBits((r00 ^ r01) & 0xffu);
      }
    }
  }
  counts[2u * b] = nv;
  counts[2u * b + 1u] = nq;
}
`;

/** One vertex per connected group of inside corners per cell, as `extractVertices`. One invocation per row of cells. */
const VERTEX_WGSL = /* wgsl */ `
${EXTRACT_COMMON_WGSL}
@group(0) @binding(3) var<storage, read> crossing: array<u32>;
@group(0) @binding(4) var<storage, read> info: array<BlockInfo>;
@group(0) @binding(5) var<storage, read> local: array<u32>;
@group(0) @binding(6) var<storage, read_write> positions: array<f32>;
// Per vertex: SWC type, cell index << 8, the component's lowest corner << 17.
@group(0) @binding(7) var<storage, read_write> vertexInfo: array<u32>;
// Per vertex, for the projection: the integer voxel of its cell, then the fraction its crossings put it at.
@group(0) @binding(8) var<storage, read_write> points: array<u32>;

@compute @workgroup_size(${B}, ${B}, 1)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  if (wg.x >= arrayLength(&crossing)) { return; }
  let b = crossing[wg.x];
  let j = lid.x;
  let k = lid.y;
  let halo = info[b].halo != 0u;
  let origin = info[b].origin;
  for (var i = 0u; i < ${B}u; i++) {
    if (!inLayer(halo, i, j, k)) { continue; }
    let mask = cellMask(b, i, j, k);
    if (mask == 0u || mask == 255u) { continue; }

    let s = (k * ${BS}u + j) * ${BS}u + i;
    var sum: array<vec3<f32>, 8>;
    var crossings: array<f32, 8>;
    var deepest: array<f32, 8>;
    var deepestAt: array<u32, 8>;
    for (var c = 0u; c < 8u; c++) {
      sum[c] = vec3<f32>(0.0);
      crossings[c] = 0.0;
      deepest[c] = -1e30;
      deepestAt[c] = 0u;
    }
    // Crossing points, averaged per component of the edge's inside end.
    let nx = tables[${T_XCOUNT}u + mask];
    for (var n = 0u; n < nx; n++) {
      let e = tables[${T_XEDGE}u + mask * 12u + n];
      let root = tables[${T_XROOT}u + mask * 12u + n];
      let c0 = EDGE_C0[e];
      let c1 = EDGE_C1[e];
      let v0 = 1.0 - value(b, s + CORNER_OFF[c0]);
      let v1 = 1.0 - value(b, s + CORNER_OFF[c1]);
      let t = clamp(v0 / (v0 - v1), ${CROSSING_MARGIN}, ${1 - CROSSING_MARGIN});
      let p0 = vec3<f32>(f32(c0 & 1u), f32((c0 >> 1u) & 1u), f32((c0 >> 2u) & 1u));
      let p1 = vec3<f32>(f32(c1 & 1u), f32((c1 >> 1u) & 1u), f32((c1 >> 2u) & 1u));
      sum[root] += p0 + t * (p1 - p0);
      crossings[root] += 1.0;
    }
    // Each component takes the type of its most interior corner.
    for (var c = 0u; c < 8u; c++) {
      if (((mask >> c) & 1u) == 0u) { continue; }
      let root = tables[${T_COMP}u + mask * 8u + c];
      let a = value(b, s + CORNER_OFF[c]);
      if (a > deepest[root]) {
        deepest[root] = a;
        deepestAt[root] = s + CORNER_OFF[c];
      }
    }
    let cell = (k * ${B}u + j) * ${B}u + i;
    let base = info[b].vertBase + local[b * ${LOCAL_WORDS}u + cell];
    let nc = tables[${T_NCOMP}u + mask];
    let ivox = info[b].first + vec3<i32>(i32(i), i32(j), i32(k));
    for (var n = 0u; n < nc; n++) {
      let c = tables[${T_ROOTS}u + mask * 8u + n];
      let f = sum[c] / crossings[c];
      let p = origin + (vec3<f32>(f32(i), f32(j), f32(k)) + f) * ex.h;
      let v = base + n;
      positions[3u * v] = p.x;
      positions[3u * v + 1u] = p.y;
      positions[3u * v + 2u] = p.z;
      vertexInfo[v] = sampleType(b, deepestAt[c]) | (cell << 8u) | (c << 17u);
      let q = ${POINT_WORDS}u * v;
      points[q] = bitcast<u32>(ivox.x);
      points[q + 1u] = bitcast<u32>(ivox.y);
      points[q + 2u] = bitcast<u32>(ivox.z);
      points[q + 3u] = bitcast<u32>(f.x);
      points[q + 4u] = bitcast<u32>(f.y);
      points[q + 5u] = bitcast<u32>(f.z);
    }
  }
}
`;

/** One quad per grid edge that changes sides, as `extractFaces` + `emitQuad`. One invocation per sample row. */
const FACE_WGSL = /* wgsl */ `
${EXTRACT_COMMON_WGSL}
@group(0) @binding(3) var<storage, read> crossing: array<u32>;
@group(0) @binding(4) var<storage, read> info: array<BlockInfo>;
@group(0) @binding(5) var<storage, read> local: array<u32>;
@group(0) @binding(6) var<storage, read> positions: array<f32>;
@group(0) @binding(7) var<storage, read_write> indices: array<u32>;

// Vertex of the component owning \`corner\` in cell (i, j, k) of block b; -1 wraps into the neighbour on that side.
fn vertexAt(b: u32, i: i32, j: i32, k: i32, corner: u32) -> u32 {
  let m = select(0u, 1u, i < 0) | select(0u, 2u, j < 0) | select(0u, 4u, k < 0);
  let nb = info[b].nb[m];
  if (nb == NONE) { return NONE; }
  let ci = u32(select(i, ${B - 1}, i < 0));
  let cj = u32(select(j, ${B - 1}, j < 0));
  let ck = u32(select(k, ${B - 1}, k < 0));
  let mask = cellMask(nb, ci, cj, ck);
  if (mask == 0u || mask == 255u || !inLayer(info[nb].halo != 0u, ci, cj, ck)) { return NONE; }
  return info[nb].vertBase + local[nb * ${LOCAL_WORDS}u + (ck * ${B}u + cj) * ${B}u + ci] + tables[${T_RANK}u + mask * 8u + corner];
}

fn position(v: u32) -> vec3<f32> {
  return vec3<f32>(positions[3u * v], positions[3u * v + 1u], positions[3u * v + 2u]);
}

// Two triangles split along the shorter diagonal. q0..q3 wind around the grid edge in its positive direction, which
// is outwards when the edge starts inside. A quad with a missing vertex is written as NONE for the CPU to count.
fn emitQuad(q: u32, q0: u32, qa: u32, q2: u32, qb: u32, startInside: bool) {
  let o = 6u * q;
  if (q0 == NONE || qa == NONE || q2 == NONE || qb == NONE) {
    for (var n = 0u; n < 6u; n++) { indices[o + n] = NONE; }
    return;
  }
  let q1 = select(qb, qa, startInside);
  let q3 = select(qa, qb, startInside);
  let d02 = position(q0) - position(q2);
  let d13 = position(q1) - position(q3);
  if (dot(d02, d02) <= dot(d13, d13)) {
    indices[o] = q0; indices[o + 1u] = q1; indices[o + 2u] = q2;
    indices[o + 3u] = q0; indices[o + 4u] = q2; indices[o + 5u] = q3;
  } else {
    indices[o] = q1; indices[o + 1u] = q2; indices[o + 2u] = q3;
    indices[o + 3u] = q1; indices[o + 4u] = q3; indices[o + 5u] = q0;
  }
}

@compute @workgroup_size(${B}, ${B}, 1)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  if (wg.x >= arrayLength(&crossing)) { return; }
  let b = crossing[wg.x];
  if (info[b].halo != 0u) { return; }
  let j = i32(lid.x);
  let k = i32(lid.y);
  let r = rowMask(b, lid.y * ${BS}u + lid.x);
  var q = info[b].quadBase + local[b * ${LOCAL_WORDS}u + ${B3}u + lid.y * ${B}u + lid.x];

  // Edges along x (corner bit 1): the four cells around one vary in y (bit 2) and z (bit 4).
  var bits = (r ^ (r >> 1u)) & 0xffu;
  while (bits != 0u) {
    let i = i32(countTrailingZeros(bits));
    bits &= bits - 1u;
    let inside = ((r >> u32(i)) & 1u) == 1u;
    let c = select(1u, 0u, inside);
    emitQuad(q, vertexAt(b, i, j, k, c), vertexAt(b, i, j - 1, k, c | 2u), vertexAt(b, i, j - 1, k - 1, c | 6u),
      vertexAt(b, i, j, k - 1, c | 4u), inside);
    q++;
  }
  // Edges along y (bit 2): cells vary in z (bit 4) and x (bit 1).
  bits = (r ^ rowMask(b, lid.y * ${BS}u + lid.x + 1u)) & 0xffu;
  while (bits != 0u) {
    let i = i32(countTrailingZeros(bits));
    bits &= bits - 1u;
    let inside = ((r >> u32(i)) & 1u) == 1u;
    let c = select(2u, 0u, inside);
    emitQuad(q, vertexAt(b, i, j, k, c), vertexAt(b, i, j, k - 1, c | 4u), vertexAt(b, i - 1, j, k - 1, c | 5u),
      vertexAt(b, i - 1, j, k, c | 1u), inside);
    q++;
  }
  // Edges along z (bit 4): cells vary in x (bit 1) and y (bit 2).
  bits = (r ^ rowMask(b, (lid.y + 1u) * ${BS}u + lid.x)) & 0xffu;
  while (bits != 0u) {
    let i = i32(countTrailingZeros(bits));
    bits &= bits - 1u;
    let inside = ((r >> u32(i)) & 1u) == 1u;
    let c = select(4u, 0u, inside);
    emitQuad(q, vertexAt(b, i, j, k, c), vertexAt(b, i - 1, j, k, c | 1u), vertexAt(b, i - 1, j - 1, k, c | 3u),
      vertexAt(b, i, j - 1, k, c | 2u), inside);
    q++;
  }
}
`;

/** The blocks of a slab and, per block, the segments reaching it. */
export interface Binning {
  /** SEG_BYTES per segment of the job. */
  segs: ArrayBuffer;
  /** Per block its first sample's global coordinates and the start of its list; one extra entry closes the last list. */
  blocks: Int32Array;
  lists: Uint32Array;
  /** Block coordinates, three per block. The slab's own blocks come first, its halo blocks last. */
  coords: Int32Array;
  /**
   * Open-addressed table of `hashMask + 1` slots holding a block index, -1 where empty, so that a shader can find the
   * block a point falls in. `find` makes the same lookup on this side.
   */
  hash: Int32Array;
  hashMask: number;
  count: number;
  ownedBlocks: number;
  /** Index of the block at these block coordinates, or -1. */
  find(bx: number, by: number, bz: number): number;
}

/**
 * The blocks a slab needs and their segment lists: per segment, the blocks its
 * band reaches (`SegmentBand`, as `splatSegment` has them), so that both
 * backends evaluate a segment at exactly the same samples.
 */
export function binSegments(job: SlabJob): Binning {
  const g = job.grid;
  const h = g.h;
  const clip = slabClip(job);
  const s = job.segs;
  const nseg = s.length / 8;

  const segs = new ArrayBuffer(Math.max(1, nseg) * SEG_BYTES);
  const sf = new Float32Array(segs);
  const si = new Int32Array(segs);
  const su = new Uint32Array(segs);

  const index = new Map<number, number>();
  const coords: number[] = [];
  // (block, segment) pairs in segment order.
  let pairs = new Uint32Array(1 << 16);
  let npairs = 0;
  const band = new SegmentBand();

  for (let p = 0; p < job.primType.length; p++) {
    const beta = job.primBeta[p],
      round = job.primRound[p];
    const secType = ((p << 8) | job.primType[p]) >>> 0;
    const end = job.primStart[p + 1];
    for (let k = job.primStart[p]; k < end; k++) {
      const q = 8 * k;
      const ax = s[q],
        ay = s[q + 1],
        az = s[q + 2],
        ra = s[q + 3];
      const bx = s[q + 4],
        by = s[q + 5],
        bz = s[q + 6],
        rb = s[q + 7];
      if (!band.set(g, clip, ax, ay, az, bx, by, bz, bandHalfWidth(Math.max(ra, rb), beta, h)))
        continue;

      // Segment in voxel units: integer sample plus fraction for the start, a plain vector for the axis.
      const ix = Math.floor(band.vx),
        iy = Math.floor(band.vy),
        iz = Math.floor(band.vz);
      const o = (k * SEG_BYTES) / 4;
      si[o] = ix;
      si[o + 1] = iy;
      si[o + 2] = iz;
      sf[o + 3] = ra / h;
      sf[o + 4] = band.vx - ix;
      sf[o + 5] = band.vy - iy;
      sf[o + 6] = band.vz - iz;
      sf[o + 7] = (rb - ra) / h;
      sf[o + 8] = band.abx;
      sf[o + 9] = band.aby;
      sf[o + 10] = band.abz;
      sf[o + 11] = band.invLen2;
      si[o + 12] = band.gx0;
      si[o + 13] = band.gy0;
      si[o + 14] = band.gz0;
      sf[o + 15] = beta;
      si[o + 16] = band.gx1;
      si[o + 17] = band.gy1;
      si[o + 18] = band.gz1;
      su[o + 19] = secType;
      su[o + 20] = job.primFamily[p];
      sf[o + 21] = round;

      for (let kb = band.bz0; kb <= band.bz1; kb++) {
        for (let jb = band.by0; jb <= band.by1; jb++) {
          for (let ib = band.bx0; ib <= band.bx1; ib++) {
            if (!band.reaches(ib, jb, kb)) continue;
            const key = blockKey(g, ib, jb, kb);
            let bi = index.get(key);
            if (bi === undefined) {
              bi = index.size;
              index.set(key, bi);
              coords.push(ib, jb, kb);
            }
            if (npairs + 2 > pairs.length) {
              const grown = new Uint32Array(pairs.length * 2);
              grown.set(pairs);
              pairs = grown;
            }
            pairs[npairs++] = bi;
            pairs[npairs++] = k;
          }
        }
      }
    }
  }

  // Number the blocks: the slab's own first, then the halo, so that owned vertices come out ahead of halo vertices.
  const count = index.size;
  const order = new Uint32Array(count);
  let ownedBlocks = 0;
  for (let b = 0; b < count; b++) if (coords[3 * b + job.axis] >= job.a0) order[b] = ownedBlocks++;
  for (let b = 0, n = ownedBlocks; b < count; b++)
    if (coords[3 * b + job.axis] < job.a0) order[b] = n++;

  // Counting sort of the pairs by block; it is stable, so every list stays in segment (hence section) order.
  const blocks = new Int32Array(4 * (count + 1));
  const sorted = new Int32Array(3 * count);
  const fill = new Uint32Array(count + 1);
  for (let i = 0; i < npairs; i += 2) fill[order[pairs[i]] + 1]++;
  for (let b = 0; b < count; b++) fill[b + 1] += fill[b];
  for (let old = 0; old < count; old++) {
    const b = order[old];
    for (let a = 0; a < 3; a++) {
      sorted[3 * b + a] = coords[3 * old + a];
      blocks[4 * b + a] = coords[3 * old + a] * B;
    }
    blocks[4 * b + 3] = fill[b];
  }
  blocks[4 * count + 3] = npairs / 2;
  const lists = new Uint32Array(Math.max(1, npairs / 2));
  for (let i = 0; i < npairs; i += 2) lists[fill[order[pairs[i]]]++] = pairs[i + 1];

  // Half-full at most, so a probe ends quickly and an absent block meets an empty slot.
  let slots = 16;
  while (slots < 2 * count) slots *= 2;
  const hash = new Int32Array(slots).fill(-1);
  const hashMask = slots - 1;
  for (let b = 0; b < count; b++) {
    let at = cellHash(sorted[3 * b], sorted[3 * b + 1], sorted[3 * b + 2]) & hashMask;
    while (hash[at] >= 0) at = (at + 1) & hashMask;
    hash[at] = b;
  }
  const find = (bx: number, by: number, bz: number): number => {
    for (let at = cellHash(bx, by, bz) & hashMask; ; at = (at + 1) & hashMask) {
      const b = hash[at];
      if (b < 0 || (sorted[3 * b] === bx && sorted[3 * b + 1] === by && sorted[3 * b + 2] === bz))
        return b;
    }
  };
  return { segs, blocks, lists, coords: sorted, hash, hashMask, count, ownedBlocks, find };
}

/** A GPU buffer that is replaced by a larger one when it runs out. */
class Reusable {
  private buffer: GPUBuffer | null = null;
  constructor(
    private device: GPUDevice,
    private usage: GPUBufferUsageFlags
  ) {}
  get(bytes: number): GPUBuffer {
    const size = Math.max(16, (bytes + 3) & ~3);
    if (this.buffer === null || this.buffer.size < size) {
      this.buffer?.destroy();
      this.buffer = this.device.createBuffer({
        size: Math.ceil(size * HEADROOM) & ~3,
        usage: this.usage,
      });
    }
    return this.buffer;
  }
}

/**
 * Every shader's compute pipeline, compiled before the device is taken on. Built synchronously, a pipeline whose
 * shader the device cannot compile is merely invalid: it raises an uncaptured error, its dispatches do nothing, and
 * the readbacks bring back an empty field, which the page would show as an empty mesh and call closed. Built
 * asynchronously it rejects, and this throws with the compiler's first error.
 */
async function buildPipelines(device: GPUDevice) {
  const build = async (label: string, code: string): Promise<GPUComputePipeline> => {
    const module = device.createShaderModule({ code, label });
    try {
      return await device.createComputePipelineAsync({
        label,
        layout: 'auto',
        compute: { module, entryPoint: 'main' },
      });
    } catch (e) {
      // The compiler says where; the pipeline's error may only say that its module is invalid.
      const info = await module.getCompilationInfo().catch(() => null);
      const error = info?.messages.find((m) => m.type === 'error');
      const where = error ? `WGSL ${label} line ${error.lineNum}` : `${label} pipeline`;
      const text = error ? error.message : errorMessage(e);
      // Firefox's compiler starts its message on a new line.
      throw new GpuError(`${where}: ${text.trim()}`);
    }
  };
  const [field, gather, count, vertex, face, project, check] = await Promise.all([
    build('field', FIELD_WGSL),
    build('gather', GATHER_WGSL),
    build('count', COUNT_WGSL),
    build('vertex', VERTEX_WGSL),
    build('face', FACE_WGSL),
    build('project', PROJECT_WGSL),
    build('check', CHECK_WGSL),
  ]);
  return { field, gather, count, vertex, face, project, check };
}

type Pipelines = Awaited<ReturnType<typeof buildPipelines>>;

/** A slab's segments and block lists on the device, as `meshSlab` puts them there for the passes that read them. */
interface SlabInput {
  bins: Binning;
  segs: GPUBuffer;
  blocks: GPUBuffer;
  lists: GPUBuffer;
  hash: GPUBuffer;
}

export class GpuMesher {
  private batchUniform: GPUBuffer;
  private extractUniform: GPUBuffer;
  private queryUniform: GPUBuffer;
  private tables: GPUBuffer;
  private segs: Reusable;
  private blocks: Reusable;
  private lists: Reusable;
  private field: Reusable;
  private flags: Reusable;
  private smallRead: Reusable;
  private crossing: Reusable;
  private packed: Reusable;
  private local: Reusable;
  private counts: Reusable;
  private info: Reusable;
  private positions: Reusable;
  private vertexInfo: Reusable;
  private indices: Reusable;
  private hash: Reusable;
  private points: Reusable;
  private shading: Reusable;
  private checkTris: Reusable;
  private verdicts: Reusable;
  /** Unmapped readback buffers, ready for reuse. */
  private idle: GPUBuffer[] = [];
  private maxBatch: number;

  private constructor(
    private device: GPUDevice,
    readonly adapterName: string,
    private pipelines: Pipelines
  ) {
    // The error scopes are open from here on: every readback checks them and opens them again.
    for (const filter of ERROR_FILTERS) device.pushErrorScope(filter);
    this.batchUniform = device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST });
    this.extractUniform = device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST });
    this.queryUniform = device.createBuffer({ size: QUERY_BYTES, usage: UNIFORM | COPY_DST });
    const tables = cellTables();
    this.tables = device.createBuffer({ size: tables.byteLength, usage: STORAGE | COPY_DST });
    device.queue.writeBuffer(this.tables, 0, tables);
    this.segs = new Reusable(device, STORAGE | COPY_DST);
    this.blocks = new Reusable(device, STORAGE | COPY_DST);
    this.lists = new Reusable(device, STORAGE | COPY_DST);
    this.field = new Reusable(device, STORAGE);
    this.flags = new Reusable(device, STORAGE | COPY_SRC | COPY_DST);
    this.smallRead = new Reusable(device, MAP_READ | COPY_DST);
    this.crossing = new Reusable(device, STORAGE | COPY_DST);
    this.packed = new Reusable(device, STORAGE | COPY_SRC);
    this.local = new Reusable(device, STORAGE);
    this.counts = new Reusable(device, STORAGE | COPY_SRC);
    this.info = new Reusable(device, STORAGE | COPY_DST);
    this.positions = new Reusable(device, STORAGE | COPY_SRC);
    this.vertexInfo = new Reusable(device, STORAGE | COPY_SRC);
    this.indices = new Reusable(device, STORAGE | COPY_SRC);
    this.hash = new Reusable(device, STORAGE | COPY_DST);
    this.points = new Reusable(device, STORAGE | COPY_DST);
    this.shading = new Reusable(device, STORAGE | COPY_SRC);
    this.checkTris = new Reusable(device, STORAGE | COPY_DST);
    this.verdicts = new Reusable(device, STORAGE | COPY_SRC);
    const bytes = Math.min(
      MAX_BATCH_BYTES,
      device.limits.maxStorageBufferBindingSize,
      device.limits.maxBufferSize
    );
    this.maxBatch = Math.min(MAX_DISPATCH, Math.floor(bytes / HEADROOM / BLOCK_BYTES));
  }

  /** Null when the browser has no WebGPU or no adapter. Rejects, saying why, if the device cannot build the shaders. */
  static async create(): Promise<GpuMesher | null> {
    const gpu = typeof navigator !== 'undefined' ? navigator.gpu : undefined;
    if (!gpu) return null;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    // Before the device, so that failing here leaves none behind: `info` is missing before Chrome 127.
    const info = adapter.info;
    const name = [info.vendor, info.architecture, info.description].filter(Boolean).join(' ');
    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: Math.min(
          MAX_BATCH_BYTES,
          adapter.limits.maxStorageBufferBindingSize
        ),
        maxBufferSize: Math.min(MAX_BATCH_BYTES, adapter.limits.maxBufferSize),
      },
    });
    device.addEventListener('uncapturederror', (ev) => console.error('WebGPU:', ev.error.message));
    const pipelines = await buildPipelines(device).catch((e: unknown) => {
      device.destroy();
      throw e;
    });
    return new GpuMesher(device, name, pipelines);
  }

  /** `meshSlab` with the field, and in "gpu" mode the extraction, on the GPU. One slab at a time per instance. */
  async meshSlab(job: SlabJob, mode: GpuMode): Promise<SlabResult> {
    const t0 = performance.now();
    const bins = binSegments(job);
    const stats: GpuFieldStats = {
      binMs: performance.now() - t0,
      waitMs: 0,
      blocks: bins.count,
      blocksRead: 0,
      readMB: 0,
      slabsExtracted: 0,
    };
    const input: SlabInput = {
      bins,
      segs: this.segs.get(bins.segs.byteLength),
      blocks: this.blocks.get(bins.blocks.byteLength),
      lists: this.lists.get(bins.lists.byteLength),
      hash: this.hash.get(bins.hash.byteLength),
    };
    if (bins.count > 0) {
      const q = this.device.queue;
      q.writeBuffer(input.segs, 0, bins.segs);
      q.writeBuffer(input.blocks, 0, bins.blocks);
      q.writeBuffer(input.lists, 0, bins.lists);
      q.writeBuffer(input.hash, 0, bins.hash);
    }
    // The extraction reaches into neighbouring blocks, so it needs the whole slab in one batch.
    const result =
      mode === 'gpu' && bins.count <= this.maxBatch
        ? await this.meshOnGpu(job, input, t0, stats)
        : await this.fieldOnGpu(job, input, t0, stats);
    result.gpu = stats;
    return result;
  }

  private bind(
    pipeline: GPUComputePipeline,
    buffers: (GPUBuffer | GPUBufferBinding)[]
  ): GPUBindGroup {
    return this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: buffers.map((b, binding) => ({
        binding,
        resource: 'buffer' in b ? b : { buffer: b },
      })),
    });
  }

  /** Encode the field pass for blocks [base, base + count), which fills the `field` and `flags` it returns from index 0. */
  private encodeField(
    enc: GPUCommandEncoder,
    input: SlabInput,
    base: number,
    count: number
  ): { field: GPUBuffer; flags: GPUBuffer } {
    const field = this.field.get(count * BLOCK_BYTES),
      flags = this.flags.get(count * 4);
    this.device.queue.writeBuffer(this.batchUniform, 0, new Uint32Array([base, count, 0, 0]));
    enc.clearBuffer(flags, 0, count * 4);
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.field);
    pass.setBindGroup(
      0,
      this.bind(this.pipelines.field, [
        this.batchUniform,
        input.segs,
        input.blocks,
        input.lists,
        field,
        flags,
      ])
    );
    pass.dispatchWorkgroups(count);
    pass.end();
    return { field, flags };
  }

  /** The bindings the point queries (PROJECT_WGSL, CHECK_WGSL) start with, the uniform set for `count` points or triangles. */
  private queryBindings(
    input: SlabInput,
    count: number,
    h: number,
    tolerance: number
  ): GPUBuffer[] {
    this.device.queue.writeBuffer(
      this.queryUniform,
      0,
      queryData(count, input.bins.hashMask, h, tolerance)
    );
    return [this.queryUniform, input.segs, input.blocks, input.lists, input.hash];
  }

  /** Field on the GPU, extraction on the CPU from the blocks the surface crosses. */
  private async fieldOnGpu(
    job: SlabJob,
    input: SlabInput,
    t0: number,
    stats: GpuFieldStats
  ): Promise<SlabResult> {
    const device = this.device;
    const g = job.grid,
      bins = input.bins;
    const blocks = new Map<number, Block>();
    const mapped: GPUBuffer[] = [];
    try {
      for (let base = 0; base < bins.count; base += this.maxBatch) {
        const count = Math.min(this.maxBatch, bins.count - base);

        // Pass 1: the field, and one word per block telling whether the surface crosses it.
        let enc = device.createCommandEncoder();
        const { field, flags } = this.encodeField(enc, input, base, count);
        const flagsRead = this.smallRead.get(count * 4);
        enc.copyBufferToBuffer(flags, 0, flagsRead, 0, count * 4);
        device.queue.submit([enc.finish()]);

        stats.waitMs += await this.readback(flagsRead, count * 4);
        const words = new Uint32Array(flagsRead.getMappedRange(0, count * 4));
        const crossing: number[] = [];
        for (let i = 0; i < count; i++) {
          if ((words[i] & ROW_FULL) !== 0 && words[i] >>> BS !== 0) crossing.push(i);
        }
        flagsRead.unmap();
        if (crossing.length === 0) continue;

        // Pass 2: pack the crossing blocks and map them.
        const bytes = crossing.length * BLOCK_BYTES;
        const crossingBuf = this.crossing.get(crossing.length * 4);
        const packed = this.packed.get(bytes);
        const read = this.readBuffer(bytes);
        device.queue.writeBuffer(crossingBuf, 0, Uint32Array.from(crossing));
        enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(this.pipelines.gather);
        pass.setBindGroup(
          0,
          this.bind(this.pipelines.gather, [
            field,
            { buffer: crossingBuf, size: crossing.length * 4 },
            packed,
          ])
        );
        pass.dispatchWorkgroups(crossing.length);
        pass.end();
        enc.copyBufferToBuffer(packed, 0, read, 0, bytes);
        device.queue.submit([enc.finish()]);

        stats.waitMs += await this.readback(read, bytes);
        mapped.push(read);
        const data = read.getMappedRange(0, bytes);
        for (let j = 0; j < crossing.length; j++) {
          const c = 3 * (base + crossing[j]);
          const bx = bins.coords[c],
            by = bins.coords[c + 1],
            bz = bins.coords[c + 2];
          blocks.set(blockKey(g, bx, by, bz), {
            bx,
            by,
            bz,
            acc: new Float32Array(data, j * BLOCK_BYTES, BS3),
            meta: null,
            packed: new Uint32Array(data, j * BLOCK_BYTES + 4 * BS3, 3 * ROWS),
            bi: blocks.size,
            cv: -1,
            multi: null,
          });
        }
      }

      stats.blocksRead = blocks.size;
      stats.readMB = (blocks.size * BLOCK_BYTES) / 1e6;
      // The extraction reads the mapped buffers in place; they are released below.
      return finishSlab(
        job,
        { blocks, ownedBlocks: bins.ownedBlocks, fieldMB: (bins.count * BLOCK_BYTES) / 1e6 },
        performance.now() - t0
      );
    } finally {
      for (const b of mapped) {
        b.unmap();
        this.idle.push(b);
      }
    }
  }

  /**
   * Field, extraction and projection on the GPU; the projected mesh comes back, and the simplification's checks go to
   * the device.
   */
  private async meshOnGpu(
    job: SlabJob,
    input: SlabInput,
    t0: number,
    stats: GpuFieldStats
  ): Promise<SlabResult> {
    const device = this.device;
    const g = job.grid,
      bins = input.bins;
    const count = bins.count;
    stats.slabsExtracted = 1;
    const timings = {
      ownedBlocks: bins.ownedBlocks,
      fieldMB: (count * BLOCK_BYTES) / 1e6,
      fieldMs: 0,
      extractStart: 0,
    };
    const empty = (): SlabResult =>
      finishSlab(
        job,
        { blocks: new Map(), ownedBlocks: bins.ownedBlocks, fieldMB: timings.fieldMB },
        performance.now() - t0
      );
    if (count === 0) return empty();

    // Submission 1: the field, then the count pass, whose per-block totals come back.
    const ownedFrom = job.a0 * B;
    const uniform = new ArrayBuffer(16);
    new Uint32Array(uniform, 0, 2).set([count, job.axis]);
    new Int32Array(uniform, 8, 1)[0] = ownedFrom;
    new Float32Array(uniform, 12, 1)[0] = g.h;
    device.queue.writeBuffer(this.extractUniform, 0, uniform);

    const local = this.local.get(count * LOCAL_WORDS * 4);
    const counts = this.counts.get(count * 8);
    const countsRead = this.smallRead.get(count * 8);
    let enc = device.createCommandEncoder();
    const { field, flags } = this.encodeField(enc, input, 0, count);
    let pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.count);
    pass.setBindGroup(
      0,
      this.bind(this.pipelines.count, [
        this.extractUniform,
        field,
        this.tables,
        input.blocks,
        flags,
        local,
        counts,
      ])
    );
    pass.dispatchWorkgroups(Math.ceil(count / WG));
    pass.end();
    enc.copyBufferToBuffer(counts, 0, countsRead, 0, count * 8);
    device.queue.submit([enc.finish()]);

    stats.waitMs += await this.readback(countsRead, count * 8);
    timings.fieldMs = performance.now() - t0;
    timings.extractStart = performance.now();

    // Offsets of every block's vertices and quads, and the blocks that have any.
    const perBlock = new Uint32Array(countsRead.getMappedRange(0, count * 8)).slice();
    countsRead.unmap();
    const vertBase = new Uint32Array(count + 1);
    const crossing: number[] = [];
    let quads = 0;
    const info = new ArrayBuffer(count * INFO_WORDS * 4);
    const infoU = new Uint32Array(info);
    const infoI = new Int32Array(info);
    const infoF = new Float32Array(info);
    for (let b = 0; b < count; b++) {
      const nv = perBlock[2 * b];
      vertBase[b + 1] = vertBase[b] + nv;
      if (nv === 0) continue;
      crossing.push(b);
      const o = b * INFO_WORDS;
      const bx = bins.coords[3 * b],
        by = bins.coords[3 * b + 1],
        bz = bins.coords[3 * b + 2];
      infoU[o] = vertBase[b];
      infoU[o + 1] = quads;
      infoU[o + 2] = b >= bins.ownedBlocks ? 1 : 0;
      infoF[o + 4] = g.ox + bx * B * g.h - job.center[0];
      infoF[o + 5] = g.oy + by * B * g.h - job.center[1];
      infoF[o + 6] = g.oz + bz * B * g.h - job.center[2];
      for (let m = 0; m < 8; m++) {
        const nb = m === 0 ? b : bins.find(bx - (m & 1), by - ((m >> 1) & 1), bz - ((m >> 2) & 1));
        infoU[o + 7 + m] = nb < 0 ? NONE : nb;
      }
      infoI[o + 16] = bx * B;
      infoI[o + 17] = by * B;
      infoI[o + 18] = bz * B;
      quads += perBlock[2 * b + 1];
    }
    const vertices = vertBase[count];
    const ownedVertices = vertBase[bins.ownedBlocks];
    if (vertices === 0) return empty();

    // Submission 2: vertices, then the faces that index them, and the mesh comes back.
    const infoBuf = this.info.get(info.byteLength);
    const crossingBuf = this.crossing.get(crossing.length * 4);
    device.queue.writeBuffer(infoBuf, 0, info);
    device.queue.writeBuffer(crossingBuf, 0, Uint32Array.from(crossing));
    const positions = this.positions.get(vertices * 12);
    const vertexInfo = this.vertexInfo.get(vertices * 4);
    const indices = this.indices.get(Math.max(1, quads) * 24);
    const points = this.points.get(vertices * POINT_WORDS * 4);
    const shading = this.shading.get(vertices * SHADING_WORDS * 4);
    const crossingBinding = { buffer: crossingBuf, size: crossing.length * 4 };
    enc = device.createCommandEncoder();
    pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.vertex);
    pass.setBindGroup(
      0,
      this.bind(this.pipelines.vertex, [
        this.extractUniform,
        field,
        this.tables,
        crossingBinding,
        infoBuf,
        local,
        positions,
        vertexInfo,
        points,
      ])
    );
    pass.dispatchWorkgroups(crossing.length);
    if (quads > 0) {
      pass.setPipeline(this.pipelines.face);
      pass.setBindGroup(
        0,
        this.bind(this.pipelines.face, [
          this.extractUniform,
          field,
          this.tables,
          crossingBinding,
          infoBuf,
          local,
          positions,
          indices,
        ])
      );
      pass.dispatchWorkgroups(crossing.length);
    }
    pass.end();

    // The faces pick their diagonal from the raw vertices, as the CPU does, so the projection comes after them.
    if (job.project) {
      pass = enc.beginComputePass();
      pass.setPipeline(this.pipelines.project);
      pass.setBindGroup(
        0,
        this.bind(this.pipelines.project, [
          ...this.queryBindings(input, vertices, g.h, 0),
          points,
          positions,
          shading,
        ])
      );
      pass.dispatchWorkgroups(Math.ceil(vertices / WG));
      pass.end();
    }

    const infoAt = vertices * 12,
      shadingAt = vertices * 16;
    const indicesAt = shadingAt + (job.project ? vertices * SHADING_WORDS * 4 : 0);
    const bytes = indicesAt + quads * 24;
    const read = this.readBuffer(bytes);
    enc.copyBufferToBuffer(positions, 0, read, 0, vertices * 12);
    enc.copyBufferToBuffer(vertexInfo, 0, read, infoAt, vertices * 4);
    if (job.project)
      enc.copyBufferToBuffer(shading, 0, read, shadingAt, vertices * SHADING_WORDS * 4);
    if (quads > 0) enc.copyBufferToBuffer(indices, 0, read, indicesAt, quads * 24);
    device.queue.submit([enc.finish()]);

    stats.waitMs += await this.readback(read, bytes);
    stats.readMB = bytes / 1e6;
    let surface: SlabSurface;
    try {
      const data = read.getMappedRange(0, bytes);
      const vinfo = new Uint32Array(data, infoAt, vertices);
      const vertexTypes = new Uint8Array(vertices);
      for (let v = 0; v < vertices; v++) vertexTypes[v] = vinfo[v] & 0xff;

      // Seam entries: the top cell layer of the slab's last block layer, and every halo vertex.
      const top: Seam = { keys: [], vertices: [] };
      const halo: Seam = { keys: [], vertices: [] };
      const topLayer = job.hasNext ? job.a1 - 1 : -1;
      for (const b of crossing) {
        const isHalo = b >= bins.ownedBlocks;
        if (!isHalo && bins.coords[3 * b + job.axis] !== topLayer) continue;
        const seam = isHalo ? halo : top;
        const cx = bins.coords[3 * b] * B,
          cy = bins.coords[3 * b + 1] * B,
          cz = bins.coords[3 * b + 2] * B;
        for (let v = vertBase[b]; v < vertBase[b + 1]; v++) {
          const cell = (vinfo[v] >>> 8) & (B3 - 1);
          const i = cell % B,
            j = ((cell / B) | 0) % B,
            k = (cell / (B * B)) | 0;
          if ((job.axis === 0 ? i : job.axis === 1 ? j : k) !== B - 1) continue;
          seam.keys.push(seamKey(g, job.axis, cx + i, cy + j, cz + k, (vinfo[v] >>> 17) & 7));
          seam.vertices.push(v);
        }
      }

      // A quad that missed one of its four vertices was written as NONE: drop it and count it.
      let tris = new Uint32Array(data, indicesAt, quads * 6).slice();
      let defects = 0;
      if (tris.includes(NONE)) {
        let n = 0;
        for (let t = 0; t < tris.length; t += 6) {
          if (tris[t] === NONE) {
            defects++;
            continue;
          }
          tris.copyWithin(n, t, t + 6);
          n += 6;
        }
        tris = tris.slice(0, n);
      }

      // The projection left a unit normal and a radius per vertex, interleaved.
      let normals: Float32Array | undefined;
      let radii: Float32Array | undefined;
      let unprojected: Uint32Array | undefined;
      if (job.project) {
        const sh = new Float32Array(data, shadingAt, vertices * SHADING_WORDS);
        normals = new Float32Array(vertices * 3);
        radii = new Float32Array(vertices);
        const left: number[] = [];
        for (let v = 0; v < vertices; v++) {
          normals[3 * v] = sh[SHADING_WORDS * v];
          normals[3 * v + 1] = sh[SHADING_WORDS * v + 1];
          normals[3 * v + 2] = sh[SHADING_WORDS * v + 2];
          const r = sh[SHADING_WORDS * v + 3];
          if (r < 0) {
            radii[v] = 0;
            left.push(v);
          } else radii[v] = r;
        }
        unprojected = Uint32Array.from(left);
      }

      surface = {
        positions: new Float32Array(data, 0, vertices * 3).slice(),
        vertexTypes,
        indices: tris,
        ownedVertices,
        top,
        halo,
        defects,
        normals,
        radii,
        unprojected,
      };
    } finally {
      read.unmap();
      this.idle.push(read);
    }

    // The simplified triangles are checked here, against the segments and the projected vertices still on the device.
    return completeSlabAsync(
      job,
      surface,
      timings,
      this.offSurfaceCheck(job, input, points, surface, stats)
    );
  }

  /**
   * `OffSurfaceCheck` for the slab `meshOnGpu` has just read back: its segments, block lists and projected vertices
   * (`points`) are still on the device. Too few triangles to be worth a round trip come back undecided, for the worker
   * to sample. The waiting goes into `stats`.
   */
  private offSurfaceCheck(
    job: SlabJob,
    input: SlabInput,
    points: GPUBuffer,
    surface: SlabSurface,
    stats: GpuFieldStats
  ): OffSurfaceCheck {
    const device = this.device;
    const g = job.grid;
    let placed = false;
    return async (indices, candidates) => {
      const n = candidates.length;
      const verdicts = new Uint8Array(n);
      if (n < GPU_CHECK_MIN_TRIANGLES) return verdicts.fill(UNDECIDED);
      // The worker projected the vertices the device could not (see `unprojected`): tell it where they went.
      if (!placed && surface.unprojected !== undefined) {
        const P = surface.positions,
          word = new Int32Array(POINT_WORDS),
          frac = new Float32Array(word.buffer, 12, 3);
        for (const v of surface.unprojected) {
          for (let a = 0; a < 3; a++) {
            const x =
              (P[3 * v + a] + job.center[a] - (a === 0 ? g.ox : a === 1 ? g.oy : g.oz)) / g.h;
            word[a] = Math.floor(x);
            frac[a] = x - word[a];
          }
          device.queue.writeBuffer(points, v * POINT_WORDS * 4, word);
        }
      }
      placed = true;

      const tris = new Uint32Array(3 * n);
      for (let i = 0; i < n; i++) {
        const t = 3 * candidates[i];
        tris[3 * i] = indices[t];
        tris[3 * i + 1] = indices[t + 1];
        tris[3 * i + 2] = indices[t + 2];
      }
      const trisBuf = this.checkTris.get(tris.byteLength);
      const out = this.verdicts.get(n * 4);
      device.queue.writeBuffer(trisBuf, 0, tris);
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(this.pipelines.check);
      pass.setBindGroup(
        0,
        this.bind(this.pipelines.check, [
          ...this.queryBindings(input, n, g.h, job.simplify),
          points,
          { buffer: trisBuf, size: tris.byteLength },
          { buffer: out, size: n * 4 },
        ])
      );
      pass.dispatchWorkgroups(Math.ceil(n / WG));
      pass.end();
      const read = this.readBuffer(n * 4);
      enc.copyBufferToBuffer(out, 0, read, 0, n * 4);
      device.queue.submit([enc.finish()]);

      stats.waitMs += await this.readback(read, n * 4);
      try {
        verdicts.set(new Uint32Array(read.getMappedRange(0, n * 4)));
      } finally {
        read.unmap();
        this.idle.push(read);
      }
      return verdicts;
    };
  }

  /**
   * Map `read` once the device has run what was submitted before, and resolve to the time spent waiting; a map that
   * takes a while is kicked (`KICK_AFTER_MS`). Rejects with the first error the device raised since the previous
   * readback: a submission that uses an invalid buffer (one the device could not allocate, say) does nothing, and
   * `read` would bring back zeros or what an earlier slab left in it. The check costs nothing next to the map: the
   * scopes come back in 0.1 ms in Chrome and 1 ms in Firefox, where the map takes 0.2 ms and, kicked, 3 to 4 ms.
   */
  private async readback(read: GPUBuffer, bytes: number): Promise<number> {
    const device = this.device;
    // Scopes pop in the reverse order of their pushes.
    const caught = ERROR_FILTERS.map(() => device.popErrorScope()).reverse();
    for (const filter of ERROR_FILTERS) device.pushErrorScope(filter);
    const t = performance.now();
    let kick = setTimeout(function again() {
      device.queue.submit([device.createCommandEncoder().finish()]);
      kick = setTimeout(again, KICK_EVERY_MS);
    }, KICK_AFTER_MS);
    const [errors, mapFailed] = await Promise.all([
      Promise.all(caught),
      read
        .mapAsync(MAP_MODE_READ, 0, bytes)
        .then(() => null, errorMessage)
        .finally(() => clearTimeout(kick)),
    ]);
    const waited = performance.now() - t;
    const i = errors.findIndex((e) => e !== null);
    if (i >= 0) {
      if (mapFailed === null) read.unmap();
      throw new GpuError(`WebGPU ${ERROR_FILTERS[i]} error: ${errors[i]!.message}`);
    }
    if (mapFailed !== null) {
      // A lost device raises no errors and fails its maps; why it was lost may come a moment later.
      const lost = await Promise.race([
        device.lost,
        new Promise<null>((r) => setTimeout(() => r(null), 100)),
      ]);
      throw new GpuError(
        lost
          ? `WebGPU device lost: ${lost.message || lost.reason}`
          : `WebGPU readback failed: ${mapFailed}`
      );
    }
    return waited;
  }

  /** An unmapped readback buffer of at least `bytes`. */
  private readBuffer(bytes: number): GPUBuffer {
    const i = this.idle.findIndex((b) => b.size >= bytes);
    if (i >= 0) return this.idle.splice(i, 1)[0];
    // Too small to be useful again: drop one before allocating a larger buffer.
    this.idle.pop()?.destroy();
    return this.device.createBuffer({
      size: Math.ceil(bytes * HEADROOM) & ~3,
      usage: MAP_READ | COPY_DST,
    });
  }
}
