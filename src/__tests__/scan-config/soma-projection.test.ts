import { describe, expect, it } from 'vitest';

import {
  sdfCapsuleWithNormal,
  type Vec3,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/sdf';
import {
  type Capsule,
  createSomaSdf,
  isSomaSection,
  projectOntoSoma,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/soma-projection';

/** A 10-unit cylinder of radius 2 along +X, centred on the origin. */
const CYLINDER: Capsule = [-5, 0, 0, 2, 5, 0, 0, 2];

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

  it('takes the nearest capsule when segments overlap', () => {
    // Second capsule is fatter, so a point 3 above the axis sits inside it.
    const sdf = createSomaSdf([CYLINDER, [-5, 0, 0, 4, 5, 0, 0, 4]]);
    expect(sdf).not.toBeNull();
    expect(sdf?.([0, 3, 0]).distance).toBeCloseTo(-1, 5);
  });
});

describe('projectOntoSoma', () => {
  it('pushes a synapse buried inside the soma out onto the surface', () => {
    const sdf = createSomaSdf([CYLINDER]);
    if (!sdf) throw new Error('expected an SDF');

    // SONATA put this one 1 unit above the axis; the rendered soma has radius 2.
    const projected = projectOntoSoma([0, 1, 0], sdf);
    expect(projected[0]).toBeCloseTo(0, 5);
    expect(projected[1]).toBeCloseTo(2, 5);
    expect(projected[2]).toBeCloseTo(0, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('pulls a synapse floating outside the soma back onto the surface', () => {
    const sdf = createSomaSdf([CYLINDER]);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSoma([0, 0, 6], sdf);
    expect(projected[2]).toBeCloseTo(2, 5);
    expect(sdf(projected).distance).toBeCloseTo(0, 5);
  });

  it('leaves a synapse already on the surface where it is', () => {
    const sdf = createSomaSdf([CYLINDER]);
    if (!sdf) throw new Error('expected an SDF');

    const projected = projectOntoSoma([0, 2, 0], sdf);
    expect(projected[1]).toBeCloseTo(2, 5);
  });
});
