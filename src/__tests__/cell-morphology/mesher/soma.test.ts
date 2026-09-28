// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  BASE_RADIUS_FRACTION,
  SOMA_MIN_RADIUS,
  STEM_FAR_DISTANCE,
  STEM_MIN_DISTANCE,
  somaFromStems,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/soma';
import {
  parseSwc,
  SWC_AXON,
  SWC_BASAL,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { cell, sampleSwc } from './mesh-utils';

const SAMPLE = sampleSwc();

describe('somaFromStems', () => {
  it("sizes the soma from the valid stems and adds a far one's sample at 25 µm", () => {
    const m = parseSwc(cell([{ d: 3 }, { d: 8, r: 2 }, { d: 12, r: 1.5 }, { d: 30, r: 1 }]));
    const st = m.somaStems;
    expect(st.center).toEqual([0, 0, 0]);
    expect(st.source).toBe('stems');
    expect(st.baseRadius).toBeCloseTo(BASE_RADIUS_FRACTION * 8, 12);
    expect(st.arbors.map((a) => [a.d, a.valid, a.far])).toEqual([
      [3, false, false],
      [8, true, false],
      [12, true, false],
      [30, true, true],
    ]);
    // The far arbor counts with its added sample, at 25.
    expect(st.stats).toMatchObject({
      arbors: 4,
      valid: 3,
      tooClose: 1,
      far: 1,
      detached: 0,
      minD: 8,
      maxD: 25,
      meanD: 15,
    });

    // The near ones emanate from their first sample, with its radius: the child's, not the soma's.
    expect(st.arbors[1].target).toEqual([0, 8, 0]);
    expect(st.arbors[1].targetRadius).toBe(2);
    expect(st.arbors[0].target).toEqual([3, 0, 0]);
    // The far one from the sample added 25 µm along its ray, its radius interpolated between the base at the centre and the traced sample at 30.
    const far = st.arbors[3];
    expect(far.target.map((v) => +v.toFixed(9))).toEqual([-STEM_FAR_DISTANCE, 0, 0]);
    expect(far.targetRadius).toBeCloseTo(6.4 + (1 - 6.4) * (25 / 30), 12);
    expect(
      m.somaStems.arbors.every(
        (a) => m.types[a.stemNode] === SWC_BASAL && m.types[a.somaNode] === 1
      )
    ).toBe(true);
    // With a valid arbor nothing is cut, not even the one within 5 µm.
    expect(st.neckDistance).toBe(0);
    expect(st.arbors.some((a) => a.cut)).toBe(false);
    expect(st.stats.cut).toBe(0);
  });

  it('takes the thresholds from the options', () => {
    const m = parseSwc(cell([{ d: 3 }, { d: 8 }, { d: 30 }]));
    const st = somaFromStems(m, { minDistance: 2, farDistance: 40, baseFraction: 0.5 });
    expect(st.arbors.map((a) => [a.valid, a.far])).toEqual([
      [true, false],
      [true, false],
      [true, false],
    ]);
    expect(st.baseRadius).toBeCloseTo(1.5, 12);
    expect(st.arbors[2].target).toEqual([0, 0, 30]);
    expect(st.stats.maxD).toBe(30);
    expect(STEM_MIN_DISTANCE).toBe(5);
    expect(STEM_FAR_DISTANCE).toBe(25);
    expect(BASE_RADIUS_FRACTION).toBe(0.8);
  });

  it('takes the fitted sphere when no arbor is valid, and cuts every arbor where it first gets 1.25 × its radius out', () => {
    // Stems along x, y and z, from 2, 4 and 0 µm out (the last on the centre), each 20 µm long.
    const st = parseSwc(cell([{ d: 2 }, { d: 4 }, { d: 0 }])).somaStems;
    expect(st.source).toBe('fitted');
    expect(st.baseRadius).toBe(6);
    expect(st.neckDistance).toBeCloseTo(6 / BASE_RADIUS_FRACTION, 12);
    expect(st.arbors.map((a) => [a.valid, a.cut])).toEqual([
      [false, true],
      [false, true],
      [false, true],
    ]);
    const cutAt = st.neckDistance;
    st.arbors.forEach((a, k) => {
      a.target.forEach((v, axis) => expect(v).toBeCloseTo(axis === k ? cutAt : 0, 9));
      expect(a.targetRadius).toBe(1);
    });
    // Nothing sizes it: no soma radii.
    expect(st.stats).toMatchObject({ arbors: 3, valid: 0, tooClose: 3, far: 0, cut: 3 });
    expect(st.stats.minD).toBeNaN();

    // A valid arbor is trusted below the fitted radius, and nothing is cut.
    const trusted = parseSwc(cell([{ d: 5 }])).somaStems;
    expect(trusted.source).toBe('stems');
    expect(trusted.baseRadius).toBeCloseTo(4, 12);
    expect(trusted.arbors[0].cut).toBe(false);
  });

  it('raises a fitted sphere smaller than a soma is to the minimum, and cuts the arbors 1.25 × that out', () => {
    // The placeholder radius of the platform's projection neurons, and stems that start on the centre.
    const st = parseSwc(
      cell(
        [
          { d: 0.001, r: 0.4 },
          { d: 0.005, r: 0.8 },
        ],
        '1 1 0 0 0 0.088 -1'
      )
    ).somaStems;
    expect(SOMA_MIN_RADIUS).toBe(5);
    expect(st.source).toBe('minimum');
    expect(st.baseRadius).toBe(SOMA_MIN_RADIUS);
    expect(st.neckDistance).toBeCloseTo(6.25, 12);
    expect(
      st.arbors.map((a) => [
        a.cut,
        +a.target[0].toFixed(9),
        +a.target[1].toFixed(9),
        a.targetRadius,
      ])
    ).toEqual([
      [true, 6.25, 0, 0.4],
      [true, 0, 6.25, 0.8],
    ]);
    // So is a soma point without a radius.
    expect(parseSwc(cell([{ d: 1 }], '1 1 0 0 0 0 -1')).somaStems).toMatchObject({
      source: 'minimum',
      baseRadius: SOMA_MIN_RADIUS,
    });
    // The minimum comes from the options.
    const m = parseSwc(cell([{ d: 1 }], '1 1 0 0 0 1 -1'));
    expect(somaFromStems(m, { minRadius: 2 })).toMatchObject({
      source: 'minimum',
      baseRadius: 2,
      neckDistance: 2 / BASE_RADIUS_FRACTION,
    });
    expect(somaFromStems(m, { minRadius: 0.5 })).toMatchObject({ source: 'fitted', baseRadius: 1 });
  });

  it('gives way to the nearest fork, and cuts no arbor whose first section ends before the cut', () => {
    const m = parseSwc(`
      1 1 0 0 0 1 -1
      2 3 1 0 0 1 1
      3 3 3 0 0 1 2
      4 3 3 10 0 0.5 3
      5 3 3 -10 0 0.5 3
      6 3 0 0 2 1 1
      7 3 0 0 30 1 6
      8 3 0 -1 0 1 1
      9 3 0 -3.5 0 1 8
    `);
    // The stem along x forks 3 µm out, the one along z runs 30 µm, the one along -y stops 3.5 µm out.
    const st = m.somaStems;
    expect(st.source).toBe('minimum');
    expect(st.baseRadius).toBeCloseTo(3, 12);
    expect(st.neckDistance).toBeCloseTo(3.75, 12);
    expect(st.arbors.map((a) => a.cut)).toEqual([false, true, false]);
    expect(st.arbors[1].target.map((v) => +v.toFixed(9))).toEqual([0, 0, 3.75]);
    expect(st.stats).toMatchObject({ arbors: 3, cut: 1 });
    // A tip is not a fork: without the stem along x, the minimum stands.
    const tip = parseSwc(
      [
        '1 1 0 0 0 1 -1',
        '6 3 0 0 2 1 1',
        '7 3 0 0 30 1 6',
        '8 3 0 -1 0 1 1',
        '9 3 0 -3.5 0 1 8',
      ].join('\n')
    );
    expect(tip.somaStems.baseRadius).toBe(SOMA_MIN_RADIUS);
  });

  it('reads the three-point soma from its centre and takes none of its side points for a stem', () => {
    const m = parseSwc(`
      1 1 0 0 0 5 -1
      2 1 0 -5 0 5 1
      3 1 0 5 0 5 1
      4 3 8 0 0 1 1
      5 3 20 0 0 1 4
      6 2 0 -9 0 0.5 1
      7 2 0 -30 0 0.5 6
    `);
    expect(m.soma.model).toBe('three-point');
    const st = m.somaStems;
    expect(st.center).toEqual([0, 0, 0]);
    expect(st.arbors.map((a) => [a.type, a.somaNode, a.d, a.valid])).toEqual([
      [SWC_BASAL, 0, 8, true],
      [SWC_AXON, 0, 9, true],
    ]);
    expect(st.baseRadius).toBeCloseTo(6.4, 12);
  });

  it('never takes a contour point for a stem', () => {
    const lines: string[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      lines.push(
        `${i + 1} 1 ${(8 * Math.cos(a)).toFixed(4)} ${(8 * Math.sin(a)).toFixed(4)} 0 0.2 ${i === 0 ? -1 : i}`
      );
    }
    // One stem on the first contour point, one on the fourth: d is measured from the centroid, not the point.
    lines.push('13 3 10 0 0 1 1', '14 3 30 0 0 1 13', '15 3 0 8 30 1 4', '16 3 0 8 60 1 15');
    const m = parseSwc(lines.join('\n'));
    expect(m.soma.model).toBe('fit');
    const st = m.somaStems;
    expect(st.stats).toMatchObject({
      arbors: 2,
      valid: 2,
      tooClose: 0,
      far: 1,
      minD: 10,
      maxD: 25,
    });
    expect(st.arbors[0].d).toBeCloseTo(10, 6);
    expect(st.arbors[1].d).toBeCloseTo(Math.hypot(8, 30), 6);
    expect(st.baseRadius).toBeCloseTo(8, 6);
  });

  it('skips and counts a neurite that is not attached to the soma', () => {
    const m = parseSwc(`
      1 1 0 0 0 6 -1
      2 3 8 0 0 1 1
      3 3 20 0 0 1 2
      4 3 100 0 0 1 -1
      5 3 110 0 0 1 4
      6 2 0 0 7 0.5 1
      7 2 0 0 7 0.5 -1
    `);
    const st = m.somaStems;
    expect(st.stats).toMatchObject({ arbors: 2, valid: 2, detached: 2 });
    expect(st.arbors.map((a) => a.stemNode)).toEqual([1, 5]);
  });

  it('gives each section forking right at the soma its own arbor', () => {
    const m = parseSwc(`
      1 1 0 0 0 6 -1
      2 3 8 0 0 1 1
      3 3 -8 0 0 1 1
      4 3 0 8 0 1 1
      5 3 0 20 0 1 4
    `);
    expect(m.somaStems.stats).toMatchObject({ arbors: 3, valid: 3, minD: 8, maxD: 8 });
  });

  it('has no arbors, and no radius, without soma points', () => {
    const m = parseSwc(`
      1 3 0 0 0 1 -1
      2 3 10 0 0 1 1
    `);
    expect(m.soma.model).toBe('none');
    expect(m.somaStems).toMatchObject({
      baseRadius: 0,
      source: 'fitted',
      neckDistance: 0,
      arbors: [],
    });
    expect(m.somaStems.stats).toMatchObject({ arbors: 0, detached: 1 });
  });

  it("raises the sample cell's soma, which every stem starts inside, to the minimum, and cuts all five stems", () => {
    const m = parseSwc(SAMPLE);
    const st = m.somaStems;
    expect(st.stats).toMatchObject({
      arbors: 5,
      valid: 0,
      tooClose: 5,
      far: 0,
      cut: 5,
      detached: 0,
    });
    expect(Math.max(...st.arbors.map((a) => a.d))).toBeLessThan(STEM_MIN_DISTANCE);
    // Traced at 3.74 µm.
    expect(m.soma.radius).toBeCloseTo(3.738, 3);
    expect(st.source).toBe('minimum');
    expect(st.baseRadius).toBe(SOMA_MIN_RADIUS);
    for (const a of st.arbors) {
      expect(Math.hypot(...a.target.map((v, i) => v - st.center[i]))).toBeCloseTo(
        st.neckDistance,
        9
      );
      // Cut on its own section: between two of its points, with a radius between theirs.
      const p = m.sections[a.section].points;
      let between = false;
      for (let k = 4; k < p.length && !between; k += 4) {
        const lo = Math.min(p[k - 1], p[k + 3]),
          hi = Math.max(p[k - 1], p[k + 3]);
        const seg = Math.hypot(p[k] - p[k - 4], p[k + 1] - p[k - 3], p[k + 2] - p[k - 2]);
        const via =
          Math.hypot(a.target[0] - p[k - 4], a.target[1] - p[k - 3], a.target[2] - p[k - 2]) +
          Math.hypot(p[k] - a.target[0], p[k + 1] - a.target[1], p[k + 2] - a.target[2]);
        between =
          Math.abs(via - seg) < 1e-9 &&
          a.targetRadius >= lo - 1e-12 &&
          a.targetRadius <= hi + 1e-12;
      }
      expect(between).toBe(true);
    }
    // The first sample is the child, with the child's radius, not the soma point.
    expect(st.arbors.every((a) => a.stemNode !== a.somaNode)).toBe(true);
  });
});
