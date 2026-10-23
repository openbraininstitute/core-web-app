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
 * The surface the circuit viewer draws: a round-capped cone a segment, at the radii the morphology states, and the
 * soma one sphere (`circuit-viewer/morphologies/load/tree.ts`). Reconstructing exactly that, rather than something
 * merely soma-shaped, is what lets a synapse land *on* what is drawn instead of near it.
 *
 * Needed because SONATA computes `afferent_surface_*` for soma synapses against a *spherical* soma of its own, which
 * need not be the drawn one, so the raw coordinates can fall inside it (invisible) or hover off it.
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

/** The reach of the soma as drawn, as a sphere around the cell position. */
export type SomaEnvelope = { centre: Vec3; radius: number };

/**
 * The smallest sphere around the cell position containing everything the soma
 * painter draws.
 *
 * This is what bounds where SONATA's spherical soma can put a synapse: that
 * sphere is derived from the same contour the morphology stores, so its radius
 * cannot reach past the contour's own extent from the cell position.
 *
 * Returns `null` for a cell with no soma, so callers can skip the rescue rather
 * than test against a sphere of radius zero.
 */
export function somaEnvelopeOf(segments: SurfaceSegment[], centre: Vec3): SomaEnvelope | null {
  let radius = 0;
  for (const { from, to } of segments) {
    for (const p of [from, to]) {
      radius = Math.max(radius, length(subtract(toVec3(p), centre)) + p.radius);
    }
  }
  return radius > 0 ? { centre, radius } : null;
}

/**
 * Put a synapse back on the mesh when the circuit left it hanging near the soma.
 *
 * SONATA models the soma as a sphere. Usually that only concerns the synapses it
 * labels as soma ones, and those get projected properly. But a few arrive
 * labelled as the *first neurite section* while still placed on that sphere — in
 * the circuit this was found in, three of 4245, sitting 13.0/13.2/13.6µm from
 * the cell position: a 0.6µm spread across a 13µm radius, which is a sphere
 * rather than scatter. A real soma is a stack of cones whose reach swings with
 * direction, so wherever it is narrower than the sphere those synapses hang in
 * space — up to 7µm clear of anything drawn.
 *
 * Confined to the soma's neighbourhood on purpose. That is where the spherical
 * model applies, and it is also what keeps this affordable: querying every
 * synapse against a whole morphology costs ~72µs each, some 300ms per cell on
 * the load path, against ~6ms for this. A stray synapse further out goes
 * unrescued — none was found beyond 1.4µm, well inside a marker's own radius.
 *
 * Returns `null` when there is nothing to do, so callers can keep the SONATA
 * coordinates and count what actually moved.
 */
export function rescueOffSurface(
  point: Vec3,
  sdf: SurfaceSdf,
  envelope: SomaEnvelope,
  tolerance: number
): Vec3 | null {
  if (length(subtract(point, envelope.centre)) > envelope.radius) return null;
  if (sdf(point).distance <= tolerance) return null;

  return projectOntoSurface(point, sdf);
}
