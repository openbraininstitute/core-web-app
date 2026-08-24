import { describe, expect, it } from 'vitest';

import {
  createSurfaceSdf,
  drawnRadiusFactor,
  isSomaSection,
  projectOntoSurface,
  rescueOffSurface,
  type SurfacePoint,
  type SurfaceSegment,
  sdfCapsuleWithNormal,
  somaEnvelopeOf,
  type Vec3,
} from '@/features/scan-config/components/drawn-surface';

const point = (x: number, y: number, z: number, radius: number): SurfacePoint => ({
  x,
  y,
  z,
  radius,
});

/** Chain samples the way the viewer does: one cone per parent→child pair. */
const chain = (points: SurfacePoint[]): SurfaceSegment[] =>
  points.slice(1).map((to, index) => ({ from: points[index], to }));

/** A 10-unit cylinder of radius 2 along +X, centred on the origin. */
const CYLINDER = chain([point(-5, 0, 0, 2), point(5, 0, 0, 2)]);

const length = ([x, y, z]: Vec3) => Math.sqrt(x * x + y * y + z * z);

describe('isSomaSection', () => {
  it('treats section id 0 as the soma', () => {
    expect(isSomaSection(0)).toBe(true);
  });

  it('treats every other section id as a neurite', () => {
    // 1 is the soma in `afferent_section_type`, but this is `afferent_section_id`
    // — mixing them up is the bug this guards against.
    expect(isSomaSection(1)).toBe(false);
    expect(isSomaSection(2)).toBe(false);
    expect(isSomaSection(42)).toBe(false);
  });
});

describe('drawnRadiusFactor', () => {
  it('leaves a segment square to the shader reference vector at full radius', () => {
    // fakeY is (0,1,0) and the axis is perpendicular to it, so the un-normalised
    // cross product happens to come out unit length and nothing is lost.
    expect(drawnRadiusFactor([0, 0, 0], [10, 0, 0])).toBeCloseTo(1, 6);
    expect(drawnRadiusFactor([0, 0, 0], [0, 0, -4])).toBeCloseTo(1, 6);
  });

  it('thins a tilted segment by the sine of its tilt', () => {
    // 45° in the XY plane: |cross((0,1,0), Z)| = sqrt(1 - 0.5).
    expect(drawnRadiusFactor([0, 0, 0], [3, 3, 0])).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('leaves a zero-length segment alone, the way the sphere branch does', () => {
    // Where a parentless root — and every single-point soma — ends up.
    expect(drawnRadiusFactor([7, -2, 1], [7, -2, 1])).toBe(1);
  });

  it('jumps at the threshold where the shader swaps its reference vector', () => {
    // Just under |Z.y| = 0.9 the shader uses (0,1,0) and the segment is drawn at
    // 44% of its radius; a hair steeper it swaps to (0,0,1) and snaps back to
    // full width. Not a rounding artefact to be smoothed over — this is the
    // discontinuity, and the projection has to follow it to stay on the mesh.
    const steep = Math.sqrt(1 - 0.9 * 0.9);
    expect(drawnRadiusFactor([0, 0, 0], [steep, 0.899, 0])).toBeCloseTo(0.436, 3);
    expect(drawnRadiusFactor([0, 0, 0], [steep, 0.901, 0])).toBeCloseTo(1, 6);
  });

  it('depends on where a segment points, not where it is or how long it runs', () => {
    const straight = drawnRadiusFactor([0, 0, 0], [3, 4, 0]);
    expect(drawnRadiusFactor([100, -50, 8], [103, -46, 8])).toBeCloseTo(straight, 6);
    expect(drawnRadiusFactor([0, 0, 0], [300, 400, 0])).toBeCloseTo(straight, 6);
  });

  it('never widens a segment', () => {
    for (const to of [
      [1, 1, 1],
      [0.2, 9, -3],
      [-6, 0.1, 0.4],
      [0, -1, 0],
    ] as Vec3[]) {
      const factor = drawnRadiusFactor([0, 0, 0], to);
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThanOrEqual(1);
    }
  });
});

describe('sdfCapsuleWithNormal', () => {
  it('reports a negative distance inside the capsule', () => {
    const { distance } = sdfCapsuleWithNormal([0, 1, 0], [-5, 0, 0], [5, 0, 0], 2, 2);
    expect(distance).toBeCloseTo(-1, 5);
  });

  it('reports a positive distance outside the capsule', () => {
    const { distance } = sdfCapsuleWithNormal([0, 5, 0], [-5, 0, 0], [5, 0, 0], 2, 2);
    expect(distance).toBeCloseTo(3, 5);
  });

  it('returns a unit normal pointing away from the axis', () => {
    const { normal } = sdfCapsuleWithNormal([0, 1, 0], [-5, 0, 0], [5, 0, 0], 2, 2);
    expect(length(normal)).toBeCloseTo(1, 5);
    expect(normal[1]).toBeCloseTo(1, 5);
  });

  it('measures from the cap once past the end of the axis', () => {
    // 3 beyond the +X cap centre, minus the radius.
    const { distance } = sdfCapsuleWithNormal([8, 0, 0], [-5, 0, 0], [5, 0, 0], 2, 2);
    expect(distance).toBeCloseTo(1, 5);
  });
});

describe('createSurfaceSdf', () => {
  it('returns null when nothing is drawn, so callers can fall back', () => {
    expect(createSurfaceSdf([])).toBeNull();
  });

  it('draws a degenerate segment as a sphere, the way a parentless root is drawn', () => {
    const root = point(0, 0, 0, 3);
    const sdf = createSurfaceSdf([{ from: root, to: root }]);
    expect(sdf?.([0, 5, 0]).distance).toBeCloseTo(2, 5);
  });

  it('keeps a degenerate segment from poisoning the rest of the union', () => {
    // A zero-length round cone divides by its squared axis length. Left
    // unguarded the NaN wins every `<` comparison and the synapse is lost.
    const stray = point(-5, 0, 0, 1);
    const sdf = createSurfaceSdf([{ from: stray, to: stray }, ...CYLINDER]);
    const { distance, normal } = sdf?.([0, 1, 0]) ?? {};
    expect(distance).toBeCloseTo(-1, 5);
    expect(normal?.every(Number.isFinite)).toBe(true);
  });

  it('takes the nearest segment, so a fatter one swallows what a thin one cannot', () => {
    // Thin cylinder out to x=5, then flaring to radius 4 by x=15.
    const sdf = createSurfaceSdf(
      chain([point(-5, 0, 0, 2), point(5, 0, 0, 2), point(15, 0, 0, 4)])
    );
    if (!sdf) throw new Error('expected an SDF');

    expect(sdf([14, 3, 0]).distance).toBeLessThan(0);
    expect(sdf([0, 3, 0]).distance).toBeCloseTo(1, 5);
  });

  it('covers the arm a star-shaped soma leaves bare when its samples are chained', () => {
    // Three samples hanging off one centre — how a contour soma reaches the
    // viewer. Chaining them in traversal order instead of drawing each from the
    // centre leaves part of the soma uncovered, and synapses projected against
    // that reconstruction hang in mid-air.
    const centre = point(0, 0, 0, 1);
    const arms = [point(6, 0, 0, 1), point(-6, 0, 0, 1), point(0, 6, 0, 1)];
    const star = createSurfaceSdf(arms.map((to) => ({ from: centre, to })));
    const chained = createSurfaceSdf(chain([centre, ...arms]));
    if (!star || !chained) throw new Error('expected an SDF');

    // Midway up the +Y arm. The viewer draws it from the centre; the chain
    // reaches that sample from a neighbouring arm instead and leaves a gap.
    expect(star([0, 3, 0]).distance).toBeCloseTo(-1, 5);
    expect(chained([0, 3, 0]).distance).toBeGreaterThan(0);
  });
});

describe('projectOntoSurface', () => {
  it('pushes a synapse buried inside the soma out onto the surface', () => {
    const sdf = createSurfaceSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    // SONATA put this one 1 unit above the axis; the drawn soma has radius 2.
    const projected = projectOntoSurface([0, 1, 0], sdf);
    expect(projected[0]).toBeCloseTo(0, 5);
    expect(projected[1]).toBeCloseTo(2, 5);
    expect(projected[2]).toBeCloseTo(0, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('pulls a synapse floating outside the soma back onto the surface', () => {
    const sdf = createSurfaceSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSurface([0, 0, 6], sdf);
    expect(projected[2]).toBeCloseTo(2, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('leaves a synapse already on the surface where it is', () => {
    const sdf = createSurfaceSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSurface([0, 2, 0], sdf);
    expect(projected[1]).toBeCloseTo(2, 5);
  });

  it('lands on the surface for a spherical soma, whichever side it started', () => {
    const root = point(10, -4, 2, 6);
    const sdf = createSurfaceSdf([{ from: root, to: root }]);
    if (!sdf) throw new Error('expected an SDF');

    for (const start of [
      [10, -4, 3],
      [10, -4, 30],
      [17, 1, 5],
    ] as Vec3[]) {
      expect(sdf(projectOntoSurface(start, sdf)).distance).toBeCloseTo(0, 4);
    }
  });
});

describe('somaEnvelopeOf', () => {
  const ORIGIN: Vec3 = [0, 0, 0];

  it('returns null for a cell that draws no soma, so the rescue is skipped', () => {
    expect(somaEnvelopeOf([], ORIGIN)).toBeNull();
  });

  it('reaches past the furthest sample by that sample own radius', () => {
    // The sphere has to contain what is drawn, not just the sample centres.
    expect(somaEnvelopeOf(CYLINDER, ORIGIN)?.radius).toBeCloseTo(7, 5);
  });

  it('measures from the cell position, not from the samples', () => {
    // The cell position is where SONATA centres its spherical soma; a soma drawn
    // off to one side has to be reached from there.
    const root = point(3, 0, 0, 1);
    expect(somaEnvelopeOf([{ from: root, to: root }], ORIGIN)?.radius).toBeCloseTo(4, 5);
  });
});

describe('rescueOffSurface', () => {
  const SOMA = createSurfaceSdf(CYLINDER);
  // Everything the cylinder draws, as a sphere about the origin.
  const ENVELOPE = { centre: [0, 0, 0] as Vec3, radius: 7 };
  const TOLERANCE = 0.5;

  if (!SOMA) throw new Error('expected an SDF');

  it('pulls a synapse the circuit left hanging near the soma back onto the mesh', () => {
    const rescued = rescueOffSurface([0, 4, 0], SOMA, ENVELOPE, TOLERANCE);
    expect(rescued).not.toBeNull();
    expect(rescued?.[1]).toBeCloseTo(2, 5);
    expect(SOMA(rescued as Vec3).distance).toBeCloseTo(0, 5);
  });

  it('leaves a synapse that already touches its branch alone', () => {
    // 0.3µm out, closer than a marker radius — moving it would change nothing
    // anyone can see, and it is data we have no reason to distrust.
    expect(rescueOffSurface([0, 2.3, 0], SOMA, ENVELOPE, TOLERANCE)).toBeNull();
  });

  it('leaves a synapse buried in the mesh alone', () => {
    expect(rescueOffSurface([0, 1, 0], SOMA, ENVELOPE, TOLERANCE)).toBeNull();
  });

  it('ignores anything beyond the soma neighbourhood, however far off it sits', () => {
    // This is the whole point of the envelope. Out here the spherical-soma model
    // does not apply, so a gap is the circuit's own geometry and not ours to
    // overrule — and testing every synapse against a whole morphology is what
    // makes the load path expensive.
    expect(SOMA([0, 20, 0]).distance).toBeGreaterThan(TOLERANCE);
    expect(rescueOffSurface([0, 20, 0], SOMA, ENVELOPE, TOLERANCE)).toBeNull();
  });
});

describe('the bounding-sphere reject', () => {
  it('agrees with a brute-force union over every segment', () => {
    // The union skips segments whose bounding sphere cannot beat the best found
    // so far. Too tight a bound would silently drop the nearest segment, and the
    // synapse would be projected onto whatever came second.
    const points = Array.from({ length: 40 }, (_, i) =>
      point(Math.cos(i) * 20, i * 3 - 60, Math.sin(i) * 20, 1 + (i % 4))
    );
    const segments = chain(points);
    const sdf = createSurfaceSdf(segments);
    if (!sdf) throw new Error('expected an SDF');

    for (const probe of [
      [0, 0, 0],
      [19, -30, 5],
      [-40, 12, 8],
      [3, 59, -17],
    ] as Vec3[]) {
      const brute = Math.min(
        ...segments.map(
          ({ from, to }) =>
            sdfCapsuleWithNormal(
              probe,
              [from.x, from.y, from.z],
              [to.x, to.y, to.z],
              from.radius,
              to.radius
            ).distance
        )
      );
      expect(sdf(probe).distance).toBeCloseTo(brute, 6);
    }
  });
});
