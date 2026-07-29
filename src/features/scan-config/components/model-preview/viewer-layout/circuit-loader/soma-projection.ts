import { scale, sdfCapsuleWithNormal, subtract, type Vec3 } from './sdf';

/**
 * Soma synapse placement.
 *
 * SONATA computes `afferent_surface_*` for soma synapses against a *spherical*
 * soma, while the SWC morphology we render describes the soma as a stack of
 * cylinders. The two disagree, so the raw coordinates land inside the rendered
 * mesh (invisible) or hover off it. Projecting each synapse onto the nearest
 * point of the cylinder stack reconciles them.
 */

/** A soma segment as a round-capped cone: two centres with their radii. */
export type Capsule = [
  x0: number,
  y0: number,
  z0: number,
  r0: number,
  x1: number,
  y1: number,
  z1: number,
  r1: number,
];

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

function sdfCapsuleAt(p: Vec3, [x0, y0, z0, r0, x1, y1, z1, r1]: Capsule) {
  return sdfCapsuleWithNormal(p, [x0, y0, z0], [x1, y1, z1], r0, r1);
}

/**
 * Combine soma segments into one distance field — the union of capsules, which
 * is their pointwise minimum.
 *
 * Returns `null` for an empty stack so callers fall back to the raw SONATA
 * coordinates instead of silently projecting against nothing.
 */
export function createSomaSdf(capsules: Capsule[]): SomaSdf | null {
  if (capsules.length === 0) return null;

  const [first, ...rest] = capsules;
  return (p: Vec3) => {
    let result = sdfCapsuleAt(p, first);
    for (const capsule of rest) {
      const candidate = sdfCapsuleAt(p, capsule);
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
