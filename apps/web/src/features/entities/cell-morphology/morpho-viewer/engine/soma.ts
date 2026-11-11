/**
 * The soma from its stems.
 *
 * The soma radius in an SWC file, and the contour points where there are some, are what the tracer drew, and they
 * say little about where the neurites actually leave the cell body. This model ignores both and sizes the soma from
 * the first sample of each arbor (NeuroMorphoMesh issue 28, steps 1–8 and 10):
 *
 *   1. An *arbor* is a tree hanging on a soma node. Its first sample is the first non-soma node of the section that
 *      starts at the soma node, with that node's own radius. Contour points are soma nodes and never count as stems;
 *      a section that starts at a root without a soma parent is not an arbor of the soma (it is counted as detached).
 *   2. The centre is what `buildSoma` finds (the single point, the three-point centre, the contour centroid).
 *   3. d is the distance from the centre to the arbor's first sample.
 *   4. d ≥ `STEM_MIN_DISTANCE`: a *valid* arbor. Its first sample is its emanation target.
 *   5. d below that: the arbor starts inside the soma, says nothing about its size, and does not emanate.
 *   6. min, max and mean of d over the valid arbors are the "soma radii".
 *   7. The base sphere sits at the centre with radius `BASE_RADIUS_FRACTION` × min d.
 *   8. d > `STEM_FAR_DISTANCE`: a first sample is added on the ray from the centre to the traced one, at that
 *      distance. It is the emanation target, with the radius interpolated linearly along the ray between the base
 *      radius at the centre and the traced sample's radius at d, and it is the arbor's d in the soma radii.
 *
 * Nothing sizes the soma when no arbor is valid: every stem starts inside it, and where it starts says nothing about
 * where it leaves. Then the sphere of `Morphology.soma` stands (`source: "fitted"`), but no smaller than
 * `SOMA_MIN_RADIUS` (`source: "minimum"`). A tracing that marks the soma with a placeholder, as the platform's
 * projection neurons do with 0.088 µm, would otherwise leave its stems pinching to a point at the centre, and of 32
 * traced somata the smallest has a radius of 4.65 µm. The minimum gives way to the nearest point where an arbor's
 * first section forks, which a soma does not hold (30 of the 32 have it outside). Every arbor is then cut where its
 * first section first gets `baseRadius / BASE_RADIUS_FRACTION` from the centre, 1.25 × the radius, and emanates from
 * that point (`cut`): the stems of the traced cells leave at 1.27 × the radius on average, and the base sphere, 0.8 ×
 * the nearest target's distance as with valid arbors, is the radius itself. An arbor whose first section ends before
 * that distance does not emanate. The one radius 0 that gets through is a file without soma points: `buildSoma`
 * gives it radius 0 and the mesher adds no soma for it, and this model does the same.
 *
 * The rule goes by the tracing: which arbors are valid, the base radius and where arbors are cut are settled here on
 * the parsed morphology. What is meshed is the prepared skeleton (prepare.ts), which smooths, resamples, untangles and
 * simplifies the sections but keeps a valid arbor's first sample as a point of its section; `stemNeck` finds it there,
 * or where a cut arbor's section gets as far from the centre, and gives the target as the preparation has left it,
 * and `collectPrimitives` (mesher.ts) builds the soma from that: the base sphere with a neck to every target (step 9).
 */
import { type Morphology, type Section, SWC_SOMA } from './swc';

/** A stem closer to the centre than this starts inside the soma: it does not size it and does not emanate. µm. */
export const STEM_MIN_DISTANCE = 5;
/** A stem beyond this gets a first sample added this far along the ray to it, and emanates from there. µm. */
export const STEM_FAR_DISTANCE = 25;
/** Radius of the base sphere as a fraction of the nearest sizing stem's distance. */
export const BASE_RADIUS_FRACTION = 0.8;
/** The least radius of a soma that no arbor sizes, unless an arbor forks nearer the centre. µm. */
export const SOMA_MIN_RADIUS = 5;

export interface SomaStemsOptions {
  /** Default `STEM_MIN_DISTANCE`. */
  minDistance?: number;
  /** Default `STEM_FAR_DISTANCE`. */
  farDistance?: number;
  /** Default `BASE_RADIUS_FRACTION`. */
  baseFraction?: number;
  /** Default `SOMA_MIN_RADIUS`. */
  minRadius?: number;
}

export interface StemArbor {
  /** Index of the arbor's first section in `Morphology.sections`. */
  section: number;
  /** Node index of the arbor's first sample: the first non-soma node of its section. */
  stemNode: number;
  /** Node index of the soma node the arbor hangs on. */
  somaNode: number;
  /** SWC type of the arbor's first section. */
  type: number;
  /** Distance from the soma centre to the traced first sample, µm. */
  d: number;
  /** Whether d is at least minDistance: a valid arbor sizes the soma and emanates from its target. */
  valid: boolean;
  /** Whether d exceeds farDistance: the target is then the sample added on the ray at farDistance, which stands in for the traced one. */
  far: boolean;
  /** Whether, as no arbor is valid, the arbor is cut where its first section first gets `SomaStems.neckDistance` from the centre, and emanates from there. */
  cut: boolean;
  /** Where the arbor is to emanate from the soma: its first sample, for a far arbor the one added at farDistance, for a cut one the point where it is cut. */
  target: [number, number, number];
  /** Radius at the target: the first sample's; for a far arbor the linear interpolation at farDistance between the base radius at the centre and the traced sample's radius at d; for a cut one the section's radius there. */
  targetRadius: number;
}

/**
 * What the base radius was taken from: the valid arbors; as none is valid, the sphere of `Morphology.soma`; or the
 * least radius a soma has, as that sphere is smaller.
 */
export type SomaBaseSource = 'stems' | 'fitted' | 'minimum';

export interface SomaStemsStats {
  /** Arbors of the soma: sections whose first node is a soma node. */
  arbors: number;
  valid: number;
  /** d < minDistance: they neither size the soma nor emanate. */
  tooClose: number;
  /** d > farDistance: valid, with a first sample added at farDistance. */
  far: number;
  /** Cut at `SomaStems.neckDistance`, as none is valid, and emanating from there. */
  cut: number;
  /** Neurite roots without a soma parent: not arbors of the soma. */
  detached: number;
  /** Over the valid arbors, a far arbor counting with farDistance, where its added sample is; NaN when there are none. */
  minD: number;
  maxD: number;
  meanD: number;
}

export interface SomaStems {
  center: [number, number, number];
  baseRadius: number;
  source: SomaBaseSource;
  /** As no arbor is valid, how far from the centre the arbors are cut to emanate from there: baseRadius / baseFraction. 0 with a valid arbor. */
  neckDistance: number;
  arbors: StemArbor[];
  stats: SomaStemsStats;
}

/**
 * The sample added `farDistance` along the ray from the centre c to a first sample at x, y, z of radius r, which is d
 * from it: its place, and its radius, interpolated linearly between the base radius at the centre and r at d.
 */
function onRay(
  c: readonly number[],
  baseRadius: number,
  x: number,
  y: number,
  z: number,
  r: number,
  d: number,
  farDistance: number
): { target: [number, number, number]; radius: number } {
  const t = farDistance / d;
  return {
    target: [c[0] + (x - c[0]) * t, c[1] + (y - c[1]) * t, c[2] + (z - c[2]) * t],
    radius: baseRadius + (r - baseRadius) * t,
  };
}

/**
 * The points of an arbor's section (x, y, z, r each) from where it first gets `D` from the centre c on, the first of
 * them interpolated there; null if it never gets that far. The walk starts at the soma node, and should that lie `D`
 * out already, the cut is at the first sample.
 */
function cutAt(p: Float64Array, c: readonly number[], D: number): Float64Array | null {
  const beyond = (k: number) =>
    Math.hypot(p[4 * k] - c[0], p[4 * k + 1] - c[1], p[4 * k + 2] - c[2]) >= D;
  if (p.length >= 8 && beyond(0)) return p.subarray(4);
  for (let k = 1; 4 * k < p.length; k++) {
    if (!beyond(k)) continue;
    // From point k − 1, inside, to point k, outside: the one crossing of the sphere, a root of |a + t b|² = D².
    const o = 4 * (k - 1);
    const ax = p[o] - c[0],
      ay = p[o + 1] - c[1],
      az = p[o + 2] - c[2];
    const bx = p[o + 4] - p[o],
      by = p[o + 5] - p[o + 1],
      bz = p[o + 6] - p[o + 2];
    const bb = bx * bx + by * by + bz * bz,
      ab = ax * bx + ay * by + az * bz;
    const t = (Math.sqrt(ab * ab - bb * (ax * ax + ay * ay + az * az - D * D)) - ab) / bb;
    // A crossing on point k itself would leave a segment of no length.
    if ((1 - t) * Math.sqrt(bb) < 1e-6) return p.subarray(4 * k);
    const cut = new Float64Array(p.length - o);
    cut.set([
      p[o] + t * bx,
      p[o + 1] + t * by,
      p[o + 2] + t * bz,
      p[o + 3] + t * (p[o + 7] - p[o + 3]),
    ]);
    cut.set(p.subarray(4 * k), 4);
    return cut;
  }
  return null;
}

/**
 * Where the neck to an arbor ends on a section as prepared, and the section from there on as the mesh takes it, as
 * points (x, y, z, r each). For a valid arbor: from its first sample, wherever the preparation has put it, or if that
 * is beyond `STEM_FAR_DISTANCE` from the centre from the sample added that far along the ray to it (`onRay`), and on
 * through the first sample. For a cut arbor: from where the section first gets `neckDistance` from the centre, a
 * point the smoothing may have moved a little. The first point is the neck's target and radius; on the section as
 * traced it is the arbor's own `target`. Null if the section has lost the sample, which the preparation does not do
 * to a valid arbor's (prepare.ts pins it), or no longer gets that far.
 */
export function stemNeck(st: SomaStems, a: StemArbor, sec: Section): Float64Array | null {
  if (a.cut) return cutAt(sec.points, st.center, st.neckDistance);
  const k = sec.nodes.indexOf(a.stemNode);
  if (k < 1) return null;
  const p = sec.points,
    c = st.center;
  const x = p[4 * k],
    y = p[4 * k + 1],
    z = p[4 * k + 2],
    r = p[4 * k + 3];
  // Whatever the preparation put in between the soma node and the first sample goes with the neck.
  const from = p.subarray(4 * k);
  const d = Math.hypot(x - c[0], y - c[1], z - c[2]);
  if (!(d > STEM_FAR_DISTANCE)) return from;
  const { target, radius } = onRay(c, st.baseRadius, x, y, z, r, d, STEM_FAR_DISTANCE);
  const points = new Float64Array(4 + from.length);
  points.set(target);
  points[3] = radius;
  points.set(from, 4);
  return points;
}

/** What `somaFromStems` reads of a morphology. */
export type StemSource = Pick<Morphology, 'nodeCount' | 'types' | 'parent' | 'sections' | 'soma'>;

/** How far from the centre c the nearest arbor's first section forks: Infinity if none does. */
function nearestFork(m: StemSource, arbors: StemArbor[], c: readonly number[]): number {
  const children = new Int32Array(m.nodeCount);
  for (let i = 0; i < m.nodeCount; i++) if (m.parent[i] >= 0) children[m.parent[i]]++;
  let nearest = Infinity;
  for (const a of arbors) {
    const s = m.sections[a.section],
      last = s.nodes.length - 1;
    if (children[s.nodes[last]] < 2) continue;
    const q = 4 * last;
    nearest = Math.min(
      nearest,
      Math.hypot(s.points[q] - c[0], s.points[q + 1] - c[1], s.points[q + 2] - c[2])
    );
  }
  return nearest;
}

export function somaFromStems(m: StemSource, opts: SomaStemsOptions = {}): SomaStems {
  const minDistance = opts.minDistance ?? STEM_MIN_DISTANCE;
  const farDistance = opts.farDistance ?? STEM_FAR_DISTANCE;
  const baseFraction = opts.baseFraction ?? BASE_RADIUS_FRACTION;
  const minRadius = opts.minRadius ?? SOMA_MIN_RADIUS;
  const center: [number, number, number] = [...m.soma.center];

  const arbors: StemArbor[] = [];
  for (const [section, s] of m.sections.entries()) {
    const somaNode = s.nodes[0];
    if (m.types[somaNode] !== SWC_SOMA || s.nodes.length < 2) continue;
    // The section's second point: the first sample.
    const x = s.points[4],
      y = s.points[5],
      z = s.points[6];
    const d = Math.hypot(x - center[0], y - center[1], z - center[2]);
    arbors.push({
      section,
      stemNode: s.nodes[1],
      somaNode,
      type: s.type,
      d,
      valid: d >= minDistance,
      far: d > farDistance,
      cut: false,
      target: [x, y, z],
      targetRadius: s.points[7],
    });
  }

  let detached = 0;
  for (let i = 0; i < m.nodeCount; i++) if (m.parent[i] < 0 && m.types[i] !== SWC_SOMA) detached++;

  // The base radius, from the valid arbors; failing that, the fitted sphere's, raised to the minimum unless an arbor
  // forks nearer. A far arbor counts with its added sample's distance.
  const sizing = arbors.filter((a) => a.valid);
  let minD = Infinity,
    maxD = -Infinity,
    sumD = 0;
  for (const a of sizing) {
    const d = Math.min(a.d, farDistance);
    if (d < minD) minD = d;
    if (d > maxD) maxD = d;
    sumD += d;
  }
  let source: SomaBaseSource = sizing.length > 0 ? 'stems' : 'fitted';
  let baseRadius = sizing.length > 0 ? baseFraction * minD : m.soma.radius;
  let neckDistance = 0;
  if (source === 'fitted' && m.soma.model !== 'none') {
    const least = Math.min(minRadius, nearestFork(m, arbors, center));
    if (baseRadius < least) {
      source = 'minimum';
      baseRadius = least;
    }
    if (baseRadius > 0) {
      // The targets lie where the base sphere, as with valid arbors, is baseFraction of their distance.
      neckDistance = baseRadius / baseFraction;
      for (const a of arbors) {
        const from = cutAt(m.sections[a.section].points, center, neckDistance);
        if (from === null) continue;
        a.cut = true;
        a.target = [from[0], from[1], from[2]];
        a.targetRadius = from[3];
      }
    }
  }

  for (const a of arbors) {
    if (!a.far) continue;
    ({ target: a.target, radius: a.targetRadius } = onRay(
      center,
      baseRadius,
      ...a.target,
      a.targetRadius,
      a.d,
      farDistance
    ));
  }

  const n = sizing.length;
  return {
    center,
    baseRadius,
    source,
    neckDistance,
    arbors,
    stats: {
      arbors: arbors.length,
      valid: n,
      tooClose: arbors.length - n,
      far: arbors.filter((a) => a.far).length,
      cut: arbors.filter((a) => a.cut).length,
      detached,
      minD: n > 0 ? minD : NaN,
      maxD: n > 0 ? maxD : NaN,
      meanD: n > 0 ? sumD / n : NaN,
    },
  };
}
