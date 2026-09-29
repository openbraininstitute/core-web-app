/**
 * Skeleton preparation: smoothing, the axon step, short sections, untangling
 * and simplification.
 *
 * Traced radii are noisy. In the bundled cell almost half of the consecutive
 * axon nodes differ in radius by more than 1.5× over about a micron, which is
 * radius estimation noise rather than anatomy, and it shows up as beads on the
 * mesh. Positions carry a little jitter too. Both are filtered along the arc
 * length of every section: a running median first (single-node spikes), then
 * a Gaussian. Section end points, i.e. branch points and tips, never move.
 *
 * Smoothing is done per node on the tree: each section is filtered from its
 * raw points, the results are written back to the section's own nodes, and the
 * sections are rebuilt from the node arrays. A child section therefore starts
 * exactly where its smoothed parent ends.
 *
 * Short sections come next (NeuroMorphoMesh#28, "Dendrites resampling"): a
 * dendrite section whose length is less than the sum of the radii at its two
 * ends keeps those two ends only. Its inner samples lie within the two end
 * spheres, and what they say about the path or the calibre in between is
 * sampling noise at the scale of the tracing. The rule has no parameter and
 * always runs, and it is not strictly geometry-preserving: an inner sample
 * fatter than both ends pokes out of the two end spheres, and the rule removes
 * it all the same, which is what the issue asks for. Axon sections are left to
 * their own resampling.
 *
 * Simplification is Ramer–Douglas–Peucker on (x, y, z, 2r): a point is dropped
 * when its removal keeps both the path and the diameter within the tolerance.
 * With the tubes every point kept is a ring, so this lightens the mesh as well
 * as the skeleton and the exports. Against the "resampling" of the issue: it is
 * per section, the two ends are always kept, it interpolates nothing (a point
 * is dropped or kept, never moved or made up), so the geometry holds to the
 * tolerance, half a voxel by default. It puts no new points on long straight
 * runs, and none are wanted: the swept tubes take a segment of any length as
 * one ring pair.
 *
 * The axon is resampled besides, at a fixed step of arc length (`axonStep`;
 * the page's default is 5 µm). An axon can be millimetres long and traced
 * every micron, and with the tubes on every skeleton point is a ring of the
 * swept tube, so its point count is its triangle count: the step bounds the
 * count by the cable length, where the simplification bounds the error by the
 * voxel. The mesh between two rings is ruled, so what the step loses is
 * exactly the chord error of a bent axon. Every step takes the
 * arc-length-weighted mean radius over its interval rather than the radius at
 * the sample: in "same" mode the radii still vary on the micron scale, and a
 * 5 µm sample would alias them.
 *
 * The order is smoothing, then the axon step and the short sections, then
 * untangling, then the simplification. The 3 µm median needs the traced
 * density; the untangling must see the chords the step makes and the stubs the
 * rule leaves so that it can part them where they touch; and the
 * simplification, which comes last, has almost nothing left to remove on the
 * axon, so the Simplify slider is in effect a dendrite control.
 */

import { arcLengths } from './segments';
import { type Morphology, type Section, SWC_AXON, SWC_SOMA } from './swc';
import { type UntangleReport, untangleSections } from './untangle';

import type { SkeletonData } from './protocol';

/** How axon radii are treated: like other neurites, smoothed harder, or replaced by the axon's median radius. */
export type AxonRadiusMode = 'same' | 'heavy' | 'constant';

export interface PrepareParams {
  /** Gaussian σ (µm) along the section, applied to radii and to positions. 0 disables smoothing. */
  smoothing: number;
  axonRadius: AxonRadiusMode;
  /** Simplification tolerance (µm) on path and diameter. 0 disables. */
  simplify: number;
  /** Arc-length step (µm) at which every axon section is resampled after smoothing. 0 or absent leaves the points. */
  axonStep?: number;
  /**
   * Move fibres that do not belong together apart until their surfaces are this far from each other, µm
   * (untangle.ts). 0 or absent leaves the tracing as it is.
   */
  untangle?: number;
  /** The mesher's blend scales, which say how far the sections around a fork belong together. */
  blend?: number;
  somaBlend?: number;
}

/** Window (µm) of the running median that removes single-node radius spikes ahead of the Gaussian. */
const MEDIAN_WINDOW = 3;
/** Radius σ multiplier for the axon in "heavy" mode. Paths keep the plain σ. */
export const HEAVY_AXON_FACTOR = 5;
/** Weight of the radius coordinate in the simplification metric: a radius error is a diameter error. */
const SIMPLIFY_RADIUS_WEIGHT = 2;

/**
 * The smoothed sections of the morphology last prepared, by its smoothing parameters. Smoothing is most of the
 * preparation and does not depend on the voxel, and a build is planned on every move of a slider.
 */
const smoothed = new WeakMap<Morphology, { key: string; sections: Section[] }>();
/** The same for the untangled sections, which take longer still, and what was done to them. */
const untangled = new WeakMap<
  Morphology,
  { key: string; sections: Section[]; report: UntangleReport }
>();
/** What the untangling did, by the morphology that `prepareMorphology` returned. */
const reports = new WeakMap<Morphology, UntangleReport>();

export function prepareMorphology(m: Morphology, p: PrepareParams): Morphology {
  const smooth = p.smoothing > 0 || p.axonRadius === 'constant';
  const simplify = p.simplify > 0;
  const untangle = (p.untangle ?? 0) > 0;
  const step = p.axonStep ?? 0;
  // The first sample of a valid arbor is where the soma's neck to it ends (soma.ts): it stays a point of its section,
  // pinned by its node wherever the stages put it among the section's points (untangling puts points before it).
  const stems = new Map<number, number>();
  for (const a of m.somaStems.arbors) if (a.valid) stems.set(a.section, a.stemNode);
  const pinned = (s: Section, i: number): number => {
    const node = stems.get(i);
    return node === undefined ? -1 : s.nodes.indexOf(node);
  };
  let sections = m.sections;
  const smoothKey = smooth ? `${p.smoothing}|${p.axonRadius}` : '';
  if (smooth) {
    let cached = smoothed.get(m);
    if (cached === undefined || cached.key !== smoothKey) {
      cached = { key: smoothKey, sections: smoothSections(m, p) };
      smoothed.set(m, cached);
    }
    sections = cached.sections;
  }
  // A linear pass, like the simplification: not worth a cache of its own.
  if (step > 0)
    sections = sections.map((s, i) =>
      s.type === SWC_AXON ? resampleFixedStep(s, step, pinned(s, i)) : s
    );
  // The short-section rule has no parameter either, so the untangle cache key does not know it.
  sections = trimShortSections(sections, pinned);
  let report: UntangleReport | undefined;
  if (untangle) {
    const o = { clearance: p.untangle!, blend: p.blend ?? 0.5, somaBlend: p.somaBlend ?? 1 };
    const key = `${smoothKey}|${step}|${o.clearance}|${o.blend}|${o.somaBlend}`;
    let cached = untangled.get(m);
    if (cached === undefined || cached.key !== key) {
      cached = { key, ...untangleSections(m, sections, o) };
      untangled.set(m, cached);
    }
    sections = cached.sections;
    report = cached.report;
  }
  if (simplify) sections = sections.map((s, i) => simplifySection(s, p.simplify, pinned(s, i)));
  // Every stage that runs replaces the array; with all of them off, and no untangling asked for, the morphology
  // itself comes back. Untangling that found nothing to move returns its input array but still has a report.
  if (sections === m.sections && report === undefined) return m;
  const out = { ...m, sections };
  if (report !== undefined) reports.set(out, report);
  return out;
}

/** What untangling did to a prepared morphology; undefined if it was not asked for. */
export function untangleReport(prepared: Morphology): UntangleReport | undefined {
  return reports.get(prepared);
}

export function countPoints(sections: Section[]): number {
  let n = 0;
  for (const s of sections) n += s.points.length / 4;
  return n;
}

/**
 * Line segments of the section polylines, relative to `center`, for the overlays. For the skeleton that stands in for
 * the mesh, `radii` adds the radius at either end of each, and `soma` comes first as a segment of no length.
 */
export function sectionSegments(
  sections: Pick<Section, 'type' | 'points'>[],
  center: [number, number, number],
  {
    radii: withRadii = false,
    soma = null,
  }: { radii?: boolean; soma?: { center: readonly number[]; radius: number } | null } = {}
): SkeletonData {
  let count = soma ? 1 : 0;
  for (const s of sections) count += Math.max(0, s.points.length / 4 - 1);
  const positions = new Float32Array(count * 6);
  const radii = withRadii ? new Float32Array(count * 2) : undefined;
  const types = new Uint8Array(count);
  const [cx, cy, cz] = center;
  let k = 0;
  if (soma) {
    const [x, y, z] = soma.center;
    positions.set([x - cx, y - cy, z - cz, x - cx, y - cy, z - cz]);
    radii?.fill(soma.radius, 0, 2);
    types[k++] = SWC_SOMA;
  }
  for (const s of sections) {
    const p = s.points;
    for (let i = 4; i < p.length; i += 4) {
      positions[6 * k] = p[i - 4] - cx;
      positions[6 * k + 1] = p[i - 3] - cy;
      positions[6 * k + 2] = p[i - 2] - cz;
      positions[6 * k + 3] = p[i] - cx;
      positions[6 * k + 4] = p[i + 1] - cy;
      positions[6 * k + 5] = p[i + 2] - cz;
      if (radii) {
        radii[2 * k] = p[i - 1];
        radii[2 * k + 1] = p[i + 3];
      }
      types[k] = s.type;
      k++;
    }
  }
  return { positions, radii, types, count };
}

// ---------------------------------------------------------------------------
// Smoothing

function smoothSections(m: Morphology, p: PrepareParams): Section[] {
  const xyz = Float64Array.from(m.xyz);
  const rad = Float64Array.from(m.radius);
  const axonConstant = p.axonRadius === 'constant' ? medianRadius(m, SWC_AXON) : -1;

  for (const sec of m.sections) {
    const pts = sec.points;
    const n = pts.length / 4;
    if (n < 2) continue;
    const isAxon = sec.type === SWC_AXON;
    const sigmaR =
      isAxon && p.axonRadius === 'heavy' ? p.smoothing * HEAVY_AXON_FACTOR : p.smoothing;
    const s = arcLengths(pts);

    let rOut: Float64Array | null = null;
    if (isAxon && axonConstant >= 0) rOut = new Float64Array(n).fill(axonConstant);
    else if (sigmaR > 0) rOut = gaussian(s, runningMedian(s, radiiOf(pts), MEDIAN_WINDOW), sigmaR);
    const pOut = p.smoothing > 0 ? gaussianPath(s, pts, p.smoothing) : null;

    // The first point belongs to the parent section; it is only a boundary sample here.
    for (let k = 1; k < n; k++) {
      const node = sec.nodes[k];
      if (rOut) rad[node] = rOut[k];
      if (pOut) {
        xyz[3 * node] = pOut[3 * k];
        xyz[3 * node + 1] = pOut[3 * k + 1];
        xyz[3 * node + 2] = pOut[3 * k + 2];
      }
    }
  }
  return m.sections.map((sec) => rebuildSection(sec, m, xyz, rad));
}

function rebuildSection(
  sec: Section,
  m: Morphology,
  xyz: Float64Array,
  rad: Float64Array
): Section {
  const n = sec.nodes.length;
  const pts = new Float64Array(4 * n);
  for (let k = 0; k < n; k++) {
    const node = sec.nodes[k];
    pts[4 * k] = xyz[3 * node];
    pts[4 * k + 1] = xyz[3 * node + 1];
    pts[4 * k + 2] = xyz[3 * node + 2];
    // Same rule as the parser: a soma parent lends its position but the child's radius.
    pts[4 * k + 3] = k === 0 && m.types[node] === SWC_SOMA && n > 1 ? rad[sec.nodes[1]] : rad[node];
  }
  return { type: sec.type, points: pts, nodes: sec.nodes };
}

/** The radii of the nodes of an SWC type, in ascending order. */
export function sortedRadii(m: Morphology, type: number): Float64Array {
  let n = 0;
  for (let i = 0; i < m.nodeCount; i++) if (m.types[i] === type) n++;
  const r = new Float64Array(n);
  for (let i = 0, k = 0; i < m.nodeCount; i++) if (m.types[i] === type) r[k++] = m.radius[i];
  return r.sort();
}

function medianRadius(m: Morphology, type: number): number {
  const r = sortedRadii(m, type);
  return r.length === 0 ? -1 : r[r.length >> 1];
}

function radiiOf(pts: Float64Array): Float64Array {
  const n = pts.length / 4;
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) r[i] = pts[4 * i + 3];
  return r;
}

/** The values of the window that `runningMedian` is at, sorted. */
let sorted = new Float64Array(16);

/** Median of the values within ±window/2 of each point along the arc. */
function runningMedian(s: Float64Array, v: Float64Array, window: number): Float64Array {
  const n = s.length;
  const out = new Float64Array(n);
  const half = window / 2;
  let lo = 0,
    hi = 0;
  for (let i = 0; i < n; i++) {
    while (s[lo] < s[i] - half) lo++;
    while (hi < n && s[hi] <= s[i] + half) hi++;
    const c = hi - lo;
    if (sorted.length < c) sorted = new Float64Array(2 * c);
    // Insertion sort: a window holds a handful of values.
    for (let j = lo; j < hi; j++) {
      const x = v[j];
      let q = j - lo;
      for (; q > 0 && sorted[q - 1] > x; q--) sorted[q] = sorted[q - 1];
      sorted[q] = x;
    }
    out[i] = c & 1 ? sorted[c >> 1] : 0.5 * (sorted[c / 2 - 1] + sorted[c / 2]);
  }
  return out;
}

/** Gaussian filter of `v` along the arc, truncated at 3σ. */
function gaussian(s: Float64Array, v: Float64Array, sigma: number): Float64Array {
  const n = s.length;
  const out = new Float64Array(n);
  const cut = 3 * sigma;
  const k = -0.5 / (sigma * sigma);
  let lo = 0,
    hi = 0;
  for (let i = 0; i < n; i++) {
    while (s[lo] < s[i] - cut) lo++;
    while (hi < n && s[hi] <= s[i] + cut) hi++;
    let w = 0,
      acc = 0;
    for (let j = lo; j < hi; j++) {
      const d = s[j] - s[i];
      const g = Math.exp(k * d * d);
      w += g;
      acc += g * v[j];
    }
    out[i] = acc / w;
  }
  return out;
}

/** Gaussian filter of the positions along the arc; the two end points stay put. */
function gaussianPath(s: Float64Array, pts: Float64Array, sigma: number): Float64Array {
  const n = s.length;
  const out = new Float64Array(3 * n);
  const cut = 3 * sigma;
  const k = -0.5 / (sigma * sigma);
  let lo = 0,
    hi = 0;
  for (let i = 0; i < n; i++) {
    while (s[lo] < s[i] - cut) lo++;
    while (hi < n && s[hi] <= s[i] + cut) hi++;
    if (i === 0 || i === n - 1) {
      out[3 * i] = pts[4 * i];
      out[3 * i + 1] = pts[4 * i + 1];
      out[3 * i + 2] = pts[4 * i + 2];
      continue;
    }
    let w = 0,
      x = 0,
      y = 0,
      z = 0;
    for (let j = lo; j < hi; j++) {
      const d = s[j] - s[i];
      const g = Math.exp(k * d * d);
      w += g;
      x += g * pts[4 * j];
      y += g * pts[4 * j + 1];
      z += g * pts[4 * j + 2];
    }
    out[3 * i] = x / w;
    out[3 * i + 1] = y / w;
    out[3 * i + 2] = z / w;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fixed-step resampling

/**
 * The section resampled at a fixed step of arc length. The end points stay as they are, position and radius, so
 * that the section keeps meeting its parent and its children; between them the points are equally spaced, by the
 * most that is no more than `step`, with their positions interpolated linearly along the traced path. The steps
 * are as long as they can be, so a section shorter than `step` keeps only its two ends. Each new point's radius is
 * the arc-length-weighted mean of the traced (piecewise linear) radius over the step centred on it, so that the
 * variation between the samples is averaged rather than aliased. The new points are nodes of nothing (-1).
 */
export function resampleFixedStep(sec: Section, step: number, pin = -1): Section {
  const p = sec.points;
  const n = p.length / 4;
  if (n <= 2 || !(step > 0)) return sec;
  if (pin > 0 && pin < n - 1) {
    // The points up to the pinned one stay as they are, and the steps are counted from it.
    const rest = resampleFixedStep(
      { type: sec.type, points: p.subarray(4 * pin), nodes: sec.nodes.subarray(pin) },
      step
    );
    const pts = new Float64Array(4 * pin + rest.points.length);
    pts.set(p.subarray(0, 4 * pin), 0);
    pts.set(rest.points, 4 * pin);
    const nodes = new Int32Array(pin + rest.nodes.length);
    nodes.set(sec.nodes.subarray(0, pin), 0);
    nodes.set(rest.nodes, pin);
    return { type: sec.type, points: pts, nodes };
  }
  const s = arcLengths(p);
  const length = s[n - 1];
  // ∫ r ds up to every traced point: a step's mean radius is the difference of two of these over the step.
  const R = new Float64Array(n);
  for (let i = 1; i < n; i++)
    R[i] = R[i - 1] + 0.5 * (p[4 * i - 1] + p[4 * i + 3]) * (s[i] - s[i - 1]);
  /** ∫ r ds up to arc length x, which lies on segment i. */
  const integral = (i: number, x: number): number => {
    const len = s[i + 1] - s[i],
      r0 = p[4 * i + 3];
    const r = len > 0 ? r0 + ((x - s[i]) / len) * (p[4 * i + 7] - r0) : r0;
    return R[i] + 0.5 * (r0 + r) * (x - s[i]);
  };
  // The 1e-9 is float noise: a section of exactly one step must not get two.
  const count = Math.max(1, Math.ceil(length / step - 1e-9));
  const h = length / count;
  const pts = new Float64Array(4 * (count + 1));
  const nodes = new Int32Array(count + 1).fill(-1);
  pts.set(p.subarray(0, 4), 0);
  pts.set(p.subarray(4 * n - 4, 4 * n), 4 * count);
  nodes[0] = sec.nodes[0];
  nodes[count] = sec.nodes[n - 1];
  // Three cursors along the traced segments: the sample and the two ends of its step, all moving forward.
  let seg = 0,
    lo = 0,
    hi = 0;
  for (let k = 1; k < count; k++) {
    const at = k * h;
    seg = segmentAt(s, at, seg);
    lo = segmentAt(s, at - 0.5 * h, lo);
    hi = segmentAt(s, at + 0.5 * h, hi);
    const len = s[seg + 1] - s[seg];
    const t = len > 0 ? (at - s[seg]) / len : 0;
    const o = 4 * seg;
    pts[4 * k] = p[o] + t * (p[o + 4] - p[o]);
    pts[4 * k + 1] = p[o + 1] + t * (p[o + 5] - p[o + 1]);
    pts[4 * k + 2] = p[o + 2] + t * (p[o + 6] - p[o + 2]);
    pts[4 * k + 3] = (integral(hi, at + 0.5 * h) - integral(lo, at - 0.5 * h)) / h;
  }
  return { type: sec.type, points: pts, nodes };
}

/** The segment holding arc length x, searched forward from segment `from`: the first whose end is at or past x. */
function segmentAt(s: Float64Array, x: number, from: number): number {
  let i = from;
  while (i + 2 < s.length && s[i + 1] < x) i++;
  return i;
}

// ---------------------------------------------------------------------------
// Short sections

/**
 * A dendrite section shorter than the sum of its end radii (as the section carries them) keeps only its two
 * end points, and the point at index `pin` if that is one between them; anything else is returned as it is.
 */
export function trimShortSection(sec: Section, pin = -1): Section {
  const p = sec.points;
  const n = p.length / 4;
  const inner = pin > 0 && pin < n - 1;
  if (n <= (inner ? 3 : 2) || sec.type === SWC_AXON) return sec;
  const limit = p[3] + p[4 * (n - 1) + 3];
  let length = 0;
  for (let i = 1; i < n && length < limit; i++) {
    const o = 4 * i;
    length += Math.hypot(p[o] - p[o - 4], p[o + 1] - p[o - 3], p[o + 2] - p[o - 2]);
  }
  if (length >= limit) return sec;
  const kept = inner ? [0, pin, n - 1] : [0, n - 1];
  const pts = new Float64Array(4 * kept.length);
  kept.forEach((i, k) => pts.set(p.subarray(4 * i, 4 * i + 4), 4 * k));
  return { type: sec.type, points: pts, nodes: Int32Array.from(kept, (i) => sec.nodes[i]) };
}

/** `trimShortSection` over the sections, each with the index `pin` gives it; the same array when none was trimmed. */
export function trimShortSections(
  sections: Section[],
  pin: (s: Section, i: number) => number = () => -1
): Section[] {
  const out = sections.map((s, i) => trimShortSection(s, pin(s, i)));
  return out.some((s, i) => s !== sections[i]) ? out : sections;
}

// ---------------------------------------------------------------------------
// Simplification

/**
 * Ramer–Douglas–Peucker on (x, y, z, λ·r), λ = `SIMPLIFY_RADIUS_WEIGHT`. End
 * points are always kept, so sections stay attached to their parents and
 * children; so is the point at index `pin`, and the simplification runs on
 * either side of it.
 */
export function simplifySection(sec: Section, eps: number, pin = -1): Section {
  const lambda = SIMPLIFY_RADIUS_WEIGHT;
  const p = sec.points;
  const n = p.length / 4;
  if (n <= 2) return sec;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const eps2 = eps * eps;
  const stack: number[] = [0, n - 1];
  if (pin > 0 && pin < n - 1) {
    keep[pin] = 1;
    stack.splice(1, 0, pin, pin);
  }
  while (stack.length) {
    const b = stack.pop()!;
    const a = stack.pop()!;
    if (b - a < 2) continue;
    const ax = p[4 * a],
      ay = p[4 * a + 1],
      az = p[4 * a + 2],
      ar = lambda * p[4 * a + 3];
    const dx = p[4 * b] - ax,
      dy = p[4 * b + 1] - ay,
      dz = p[4 * b + 2] - az,
      dr = lambda * p[4 * b + 3] - ar;
    const len2 = dx * dx + dy * dy + dz * dz + dr * dr;
    let best = -1,
      bi = -1;
    for (let i = a + 1; i < b; i++) {
      const vx = p[4 * i] - ax,
        vy = p[4 * i + 1] - ay,
        vz = p[4 * i + 2] - az,
        vr = lambda * p[4 * i + 3] - ar;
      let t = len2 > 0 ? (vx * dx + vy * dy + vz * dz + vr * dr) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = vx - t * dx,
        ey = vy - t * dy,
        ez = vz - t * dz,
        er = vr - t * dr;
      const d2 = ex * ex + ey * ey + ez * ez + er * er;
      if (d2 > best) {
        best = d2;
        bi = i;
      }
    }
    if (best > eps2) {
      keep[bi] = 1;
      stack.push(a, bi, bi, b);
    }
  }
  let cnt = 0;
  for (let i = 0; i < n; i++) cnt += keep[i];
  if (cnt === n) return sec;
  const pts = new Float64Array(4 * cnt);
  const nodes = new Int32Array(cnt);
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (!keep[i]) continue;
    pts.set(p.subarray(4 * i, 4 * i + 4), 4 * k);
    nodes[k] = sec.nodes[i];
    k++;
  }
  return { type: sec.type, points: pts, nodes };
}
