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
 * "Drawn" is meant literally, bugs included — see {@link drawnRadiusFactor}.
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

/**
 * How much thinner than its stated radius the renderer actually draws a segment.
 *
 * `TgdPainterSegments` builds each capsule's frame in its vertex shader and
 * forgets to normalise it:
 *
 * ```glsl
 * vec3 Z = dir / len;
 * vec3 fakeY = abs(Z.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
 * vec3 X = cross(fakeY, Z);   // |X| = sin(angle between them), not 1
 * vec3 Y = cross(Z, X);
 * pos = mat3(X, Y, Z) * (pos * radius) + center;
 * ```
 *
 * `X` and `Y` span the capsule's cross-section, so the segment is drawn
 * `sqrt(1 - (fakeY·Z)²)` times as thick as it should be while its reach along
 * `Z` is untouched. The `fakeY` switch also makes that discontinuous: a segment
 * just under the 0.9 threshold is drawn at 0.436 of its radius and jumps back to
 * full width just over it. Zero-length segments take the shader's sphere branch,
 * which never builds the basis, so single-point somas are drawn correctly.
 *
 * Somas are the only place it shows. A typical one lands near 0.71 — a 29%
 * shortfall, enough for a soma synapse projected onto the soma the *morphology*
 * describes to stand ~2.4µm proud of the soma the viewer *paints*. Neurites lose
 * the same 29% but their median radius is 0.22µm, so it costs them 0.06µm.
 *
 * Projecting onto the shrunken shape instead is knowingly wrong: the synapses
 * stop sitting where the data puts them and sit where the picture is. It errs in
 * the harmless direction, though — shrinking the radius isotropically describes a
 * shape strictly inside what is drawn, because the renderer squashes the
 * cross-section but leaves the caps' reach along the axis alone. A synapse can
 * come out slightly buried; it cannot come out floating.
 *
 * The upstream fix is `normalize(cross(fakeY, Z))`. The day tgd ships it, delete
 * this and the projection goes back to being honest.
 *
 * Expects morphology-local coordinates: the shader runs before the cell's
 * orientation is applied, so which way a segment points to the renderer is not
 * which way it points in the world.
 *
 * @see node_modules/@tolokoban/tgd/lib/dist/painter/segments/segments.js
 */
export function drawnRadiusFactor(from: Vec3, to: Vec3): number {
  const axis = subtract(to, from);
  const len = length(axis);
  if (len === 0) return 1;

  const [, y, z] = scale(axis, 1 / len);
  const alignment = Math.abs(y) < 0.9 ? y : z;
  return Math.sqrt(Math.max(0, 1 - alignment * alignment));
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
