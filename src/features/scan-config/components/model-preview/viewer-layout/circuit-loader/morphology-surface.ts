import {
  add,
  length,
  scale,
  sdfCapsuleWithNormal,
  sdfSphereWithNormal,
  subtract,
  type Vec3,
} from './sdf';

/**
 * The surface the viewer actually draws.
 *
 * `TgdPainterSegments` renders a morphology as a union of round-capped cones —
 * one per parent→child sample pair, with a parentless root drawn as a sphere.
 * Reconstructing exactly that, rather than something merely soma-shaped, is what
 * lets a synapse land *on* the mesh instead of near it.
 *
 * Needed because SONATA computes `afferent_surface_*` for soma synapses against
 * a *spherical* soma, while the SWC morphology describes the soma as a stack of
 * cones. The two disagree, so the raw coordinates fall inside the drawn mesh
 * (invisible) or hover off it.
 *
 * @see node_modules/@openbraininstitute/morphoviewer/dist/components/morpho-viewer-small-circuit/painter/painter-cell/factory/tree.js
 */

/** A morphology sample in world coordinates. */
export type SurfacePoint = { x: number; y: number; z: number; radius: number };

/** One drawn segment: the round-capped cone between two samples. */
export type SurfaceSegment = { from: SurfacePoint; to: SurfacePoint };

/** Signed distance from a point to the surface, plus the normal there. */
export type SurfaceSdf = (p: Vec3) => { distance: number; normal: Vec3 };

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

const toVec3 = ({ x, y, z }: SurfacePoint): Vec3 => [x, y, z];

/** A single drawn shape, plus the bounding sphere used to skip it cheaply. */
type Part = {
  sdf: SurfaceSdf;
  center: Vec3;
  bound: number;
};

/**
 * Build the signed distance field for a set of drawn segments. Their union is
 * the pointwise minimum.
 *
 * Returns `null` when there is nothing to project onto, so callers can fall back
 * to the raw SONATA coordinates instead of silently projecting against nothing.
 */
export function createSurfaceSdf(segments: SurfaceSegment[]): SurfaceSdf | null {
  const parts: Part[] = [];
  for (const { from, to } of segments) {
    const a = toVec3(from);
    const b = toVec3(to);
    const axis = length(subtract(b, a));
    if (axis === 0) {
      // A parentless root is drawn as a degenerate segment, which is a sphere.
      // The round-cone maths cannot express that — it divides by the squared
      // axis length, and the NaN it returns loses every `<` comparison below,
      // so it would silently win the union and push the point to NaN.
      const radius = Math.max(from.radius, to.radius);
      parts.push({ sdf: (p) => sdfSphereWithNormal(p, a, radius), center: a, bound: radius });
      continue;
    }
    parts.push({
      sdf: (p) => sdfCapsuleWithNormal(p, a, b, from.radius, to.radius),
      center: scale(add(a, b), 0.5),
      bound: axis / 2 + Math.max(from.radius, to.radius),
    });
  }

  if (parts.length === 0) return null;

  return (p: Vec3) => {
    let nearest = parts[0].sdf(p);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Nothing on this segment can beat what we already have: it lies entirely
      // within `bound` of its centre, so its signed distance is at least
      // `|p - centre| - bound`. Rejecting on that is what keeps a union over a
      // whole morphology — tens of thousands of segments — affordable.
      if (length(subtract(p, part.center)) - part.bound >= nearest.distance) continue;
      const candidate = part.sdf(p);
      if (candidate.distance < nearest.distance) nearest = candidate;
    }
    return nearest;
  };
}

/** Slide a point along the surface normal until it lands on the surface. */
export function projectOntoSurface(point: Vec3, sdf: SurfaceSdf): Vec3 {
  const { distance, normal } = sdf(point);
  return subtract(point, scale(normal, distance));
}
