/**
 * Minimal signed-distance-field maths for sticking synapses onto a morphology.
 *
 * Only what the soma projection needs: a capsule (round-capped cone) is the
 * shape a pair of consecutive SWC soma points describes, and the projection
 * needs the surface normal alongside the distance so it can slide a point onto
 * the surface rather than merely measure how far off it is.
 *
 * Capsule maths adapted from Inigo Quilez's `sdRoundCone`.
 * @see https://iquilezles.org/articles/distfunctions/
 */

export type Vec3 = [x: number, y: number, z: number];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function sign(value: number): number {
  if (value === 0) return 0;
  return value < 0 ? -1 : 1;
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

/** A unit vector perpendicular to `v`, crossed against whichever basis axis `v` leans on least. */
function anyPerpendicular(v: Vec3): Vec3 {
  const helper: Vec3 = Math.abs(v[0]) <= Math.abs(v[1]) ? [1, 0, 0] : [0, 1, 0];
  const c: Vec3 = [
    v[1] * helper[2] - v[2] * helper[1],
    v[2] * helper[0] - v[0] * helper[2],
    v[0] * helper[1] - v[1] * helper[0],
  ];
  return scale(c, 1 / length(c));
}

/**
 * Signed distance from `p` to a sphere, plus the outward unit normal.
 *
 * Used for somas that survive as a single point, and as the fallback for
 * zero-length capsules — which the round-cone maths cannot express (it divides
 * by the squared axis length).
 */
export function sdfSphereWithNormal(
  p: Vec3,
  center: Vec3,
  radius: number
): { distance: number; normal: Vec3 } {
  const delta = subtract(p, center);
  const len = length(delta);
  // Dead centre has no defined normal; any direction puts the point on the
  // surface, which beats propagating NaN into the coordinate buffer.
  const normal: Vec3 = len === 0 ? [0, 1, 0] : scale(delta, 1 / len);
  return { distance: len - radius, normal };
}

/**
 * Signed distance from `p` to the capsule spanning `a`→`b` with radii `r1`/`r2`,
 * plus the outward unit normal at the closest surface point.
 *
 * Negative distance means `p` is inside the capsule — which is the common case
 * here, since SONATA places soma synapses on a sphere that the SWC cylinder
 * stack usually encloses.
 */
export function sdfCapsuleWithNormal(
  p: Vec3,
  a: Vec3,
  b: Vec3,
  r1: number,
  r2: number
): { distance: number; normal: Vec3 } {
  // Shape-only terms.
  const ba = subtract(b, a);
  const l2 = dot(ba, ba);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;

  const pa = subtract(p, a);
  const pb = subtract(p, b);
  const y = dot(pa, ba);
  const z = y - l2;
  // Clamped: on the axis this is 0 in exact maths but can round a hair negative,
  // and the square roots below would turn that into NaN.
  const x2 = Math.max(0, l2 * dot(pa, pa) - y * y);
  const y2 = y * y;
  const z2 = z * z;
  const k = sign(rr) * rr * rr * x2;

  // Beyond the `b` cap.
  if (sign(z) * a2 * z2 > k) {
    const w = Math.sqrt(il2 * (x2 + z2));
    return { distance: w - r2, normal: scale(pb, 1 / w) };
  }
  // Beyond the `a` cap.
  if (sign(y) * a2 * y2 < k) {
    const w = Math.sqrt(il2 * (x2 + y2));
    return { distance: w - r1, normal: scale(pa, 1 / w) };
  }
  // Against the cone flank. The normal leans off the radial direction by the
  // cone's half-angle: cos = sqrt(a2 / l2) radially, sin = rr / |ba| along the
  // axis. Built from those two unit parts, it stays unit length at any distance
  // from the axis, where scaling the whole sum by 1 / w made the axial part blow
  // up as a point neared the axis and flung projected synapses off the branch.
  const w = Math.sqrt(x2 * a2);
  const radial = subtract(pa, scale(ba, y * il2));
  const radialLength = length(radial);
  // On the axis every direction off it is equally near; pick one rather than
  // divide 0 by 0, so an axial point (a synapse centre, say) lands on the surface.
  const outward = radialLength > 0 ? scale(radial, 1 / radialLength) : anyPerpendicular(ba);
  const normal = add(scale(outward, Math.sqrt(Math.max(0, a2 * il2))), scale(ba, rr * il2));
  return { distance: (w + y * rr) * il2 - r1, normal };
}
