import {
  length,
  scale,
  sdfCapsuleWithNormal,
  sdfSphereWithNormal,
  subtract,
  type Vec3,
} from './sdf';

/**
 * Soma synapse placement.
 *
 * SONATA computes `afferent_surface_*` for soma synapses against a *spherical*
 * soma, while the SWC morphology we render describes the soma as a stack of
 * cylinders. The two disagree, so the raw coordinates land inside the rendered
 * mesh (invisible) or hover off it. Projecting each synapse onto the nearest
 * point of the cylinder stack reconciles them.
 */

/** A soma sample in world coordinates. */
export type SomaPoint = { x: number; y: number; z: number; radius: number };

/** Signed distance from a point to the soma surface, plus the normal there. */
export type SomaSdf = (p: Vec3) => { distance: number; normal: Vec3 };

/**
 * SONATA reserves `afferent_section_id === 0` for the soma.
 *
 * Why not `afferent_section_type === 1`, which the spec nominates: several
 * released circuits emit only 0 (unknown) and 2 (axon) and never 1 at all, so
 * the type field can't be trusted to identify soma synapses.
 */
export function isSomaSection(sectionId: number): boolean {
  return sectionId === 0;
}

const toVec3 = ({ x, y, z }: SomaPoint): Vec3 => [x, y, z];

/**
 * Build the soma distance field from its samples.
 *
 * Consecutive samples become round-capped cones; the union of those is their
 * pointwise minimum. Coincident samples are skipped rather than turned into
 * zero-length cones — the round-cone maths divides by the squared axis length,
 * and a single NaN there poisons every subsequent `<` comparison and silently
 * pushes synapses to NaN coordinates.
 *
 * Samples are chained in traversal order. Somas written as a chain (the common
 * MorphIO output) reconstruct exactly; somas written as a star around a centre
 * still yield a covering blob.
 *
 * Returns `null` when there is nothing to project onto, so callers fall back to
 * the raw SONATA coordinates instead of silently projecting against nothing.
 */
export function createSomaSdf(points: SomaPoint[]): SomaSdf | null {
  if (points.length === 0) return null;

  const parts: SomaSdf[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const from = toVec3(a);
    const to = toVec3(b);
    if (length(subtract(to, from)) === 0) continue;

    parts.push((p) => sdfCapsuleWithNormal(p, from, to, a.radius, b.radius));
  }

  // A single sample, or a stack whose samples all coincide: a sphere is the
  // only shape those describe.
  if (parts.length === 0) {
    const fattest = points.reduce((best, p) => (p.radius > best.radius ? p : best));
    const center = toVec3(fattest);
    return (p) => sdfSphereWithNormal(p, center, fattest.radius);
  }

  const [first, ...rest] = parts;
  return (p: Vec3) => {
    let result = first(p);
    for (const part of rest) {
      const candidate = part(p);
      if (candidate.distance < result.distance) result = candidate;
    }
    return result;
  };
}

/** Slide a point along the surface normal until it lands on the soma surface. */
export function projectOntoSoma(surface: Vec3, sdf: SomaSdf): Vec3 {
  const { distance, normal } = sdf(surface);
  return subtract(surface, scale(normal, distance));
}
