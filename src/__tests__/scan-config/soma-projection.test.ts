import { describe, expect, it } from 'vitest';

import {
  sdfCapsuleWithNormal,
  type Vec3,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/sdf';
import {
  createSomaSdf,
  isSomaSection,
  projectOntoSoma,
  type SomaPoint,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/soma-projection';

/** A 10-unit cylinder of radius 2 along +X, centred on the origin. */
const CYLINDER: SomaPoint[] = [
  { x: -5, y: 0, z: 0, radius: 2 },
  { x: 5, y: 0, z: 0, radius: 2 },
];

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

describe('createSomaSdf', () => {
  it('returns null for an empty soma so callers can fall back', () => {
    expect(createSomaSdf([])).toBeNull();
  });

  it('treats a single sample as a sphere', () => {
    const sdf = createSomaSdf([{ x: 0, y: 0, z: 0, radius: 3 }]);
    expect(sdf?.([0, 5, 0]).distance).toBeCloseTo(2, 5);
  });

  it('falls back to a sphere when every sample coincides', () => {
    // A zero-length round cone divides by its squared axis length. Left
    // unguarded the NaN wins every `<` comparison and the synapse is lost.
    const sdf = createSomaSdf([
      { x: 1, y: 1, z: 1, radius: 2 },
      { x: 1, y: 1, z: 1, radius: 3 },
    ]);
    const { distance, normal } = sdf?.([1, 6, 1]) ?? {};
    expect(distance).toBeCloseTo(2, 5);
    expect(normal?.every(Number.isFinite)).toBe(true);
  });

  it('skips coincident samples without poisoning the rest of the stack', () => {
    const sdf = createSomaSdf([
      { x: -5, y: 0, z: 0, radius: 2 },
      { x: -5, y: 0, z: 0, radius: 2 },
      { x: 5, y: 0, z: 0, radius: 2 },
    ]);
    expect(sdf?.([0, 1, 0]).distance).toBeCloseTo(-1, 5);
  });

  it('takes the nearest segment, so a fatter one swallows what a thin one cannot', () => {
    // Thin cylinder out to x=5, then flaring to radius 4 by x=15.
    const sdf = createSomaSdf([...CYLINDER, { x: 15, y: 0, z: 0, radius: 4 }]);
    if (!sdf) throw new Error('expected an SDF');

    expect(sdf([14, 3, 0]).distance).toBeLessThan(0);
    expect(sdf([0, 3, 0]).distance).toBeCloseTo(1, 5);
  });
});

describe('projectOntoSoma', () => {
  it('pushes a synapse buried inside the soma out onto the surface', () => {
    const sdf = createSomaSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    // SONATA put this one 1 unit above the axis; the rendered soma has radius 2.
    const projected = projectOntoSoma([0, 1, 0], sdf);
    expect(projected[0]).toBeCloseTo(0, 5);
    expect(projected[1]).toBeCloseTo(2, 5);
    expect(projected[2]).toBeCloseTo(0, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('pulls a synapse floating outside the soma back onto the surface', () => {
    const sdf = createSomaSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSoma([0, 0, 6], sdf);
    expect(projected[2]).toBeCloseTo(2, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('leaves a synapse already on the surface where it is', () => {
    const sdf = createSomaSdf(CYLINDER);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSoma([0, 2, 0], sdf);
    expect(projected[1]).toBeCloseTo(2, 5);
  });

  it('lands on the surface for a spherical soma, whichever side it started', () => {
    const sdf = createSomaSdf([{ x: 10, y: -4, z: 2, radius: 6 }]);
    if (!sdf) throw new Error('expected an SDF');

    for (const start of [
      [10, -4, 3],
      [10, -4, 30],
      [17, 1, 5],
    ] as Vec3[]) {
      expect(sdf(projectOntoSoma(start, sdf)).distance).toBeCloseTo(0, 4);
    }
  });
});
