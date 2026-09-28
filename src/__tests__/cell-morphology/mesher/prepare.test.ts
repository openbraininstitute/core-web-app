// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildMesh } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import {
  countPoints,
  type PrepareParams,
  prepareMorphology,
  resampleFixedStep,
  sectionSegments,
  trimShortSection,
  trimShortSections,
  untangleReport,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/prepare';
import {
  type Morphology,
  parseSwc,
  type Section,
  SWC_AXON,
  SWC_BASAL,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { checkMesh, connectedComponents, SAMPLE_CELL_TIMEOUT, sampleSwc } from './mesh-utils';

const OFF: PrepareParams = { smoothing: 0, axonRadius: 'same', simplify: 0 };

const radii = (s: Section): number[] =>
  [...Array(s.points.length / 4).keys()].map((i) => s.points[4 * i + 3]);
const point = (s: Section, i: number): number[] => [...s.points.subarray(4 * i, 4 * i + 4)];

/** Soma plus one straight dendrite along x with the given radii, 1 µm apart. */
function straight(rs: number[], type = SWC_BASAL): string {
  const lines = ['1 1 0 0 0 3 -1'];
  rs.forEach((r, i) => lines.push(`${i + 2} ${type} ${i + 1} 0 0 ${r} ${i + 1}`));
  return lines.join('\n');
}

const sampleCell = () => parseSwc(sampleSwc());

describe('prepareMorphology', () => {
  it('is the identity when everything is off and no section is short', () => {
    const m = parseSwc(straight([1, 1, 1]));
    expect(prepareMorphology(m, OFF)).toBe(m);
    expect(prepareMorphology(m, { ...OFF, axonRadius: 'heavy' })).toBe(m);
    // Untangling that found nothing to move still reports so.
    expect(untangleReport(prepareMorphology(m, { ...OFF, untangle: 0.25 }))).toMatchObject({
      contacts: 0,
    });
  });

  it('removes a single-node radius spike without touching the point count', () => {
    const m = parseSwc(straight([1, 1, 1, 1, 5, 1, 1, 1, 1, 1]));
    const out = prepareMorphology(m, { ...OFF, smoothing: 1 });
    const r = radii(out.sections[0]);
    expect(r.length).toBe(11);
    expect(Math.max(...r)).toBeLessThan(1.01);
    expect(Math.min(...r)).toBeGreaterThan(0.99);
    expect(m.sections[0].points[4 * 5 + 3]).toBe(5);
  });

  it('keeps child sections attached to their smoothed parent and leaves end points in place', () => {
    // Points about 1 µm apart so a σ of 1 µm reaches the neighbours.
    const m = parseSwc(`
      1 1 0 0 0 4 -1
      2 3 0 0 0 1 1
      3 3 1 0.3 0 1.5 2
      4 3 2 -0.2 0 0.7 3
      5 3 3 0 0 1.2 4
      6 3 4 1 0 0.6 5
      7 3 5 2 0 0.9 6
      8 3 4 -1 0 0.5 5
      9 3 5 -2 0 0.8 8
    `);
    const out = prepareMorphology(m, { ...OFF, smoothing: 1 });
    expect(out.sections).toHaveLength(3);
    const [parent, childA, childB] = out.sections;
    expect(point(childA, 0)).toEqual(point(parent, 4));
    expect(point(childB, 0)).toEqual(point(parent, 4));
    // Branch point (node 5) and tips (7, 9) keep their traced positions; an interior point moved.
    expect(point(parent, 4).slice(0, 3)).toEqual([3, 0, 0]);
    expect(point(childA, 2).slice(0, 3)).toEqual([5, 2, 0]);
    expect(point(childB, 2).slice(0, 3)).toEqual([5, -2, 0]);
    expect(point(parent, 2)[1]).not.toBe(0.3);
    expect(Math.abs(point(parent, 2)[1])).toBeLessThan(0.3);
    // Radii were smoothed: the 1.5 / 0.7 swing is gone.
    const r = radii(parent);
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(0.5);
    // The soma-parent rule still applies to the first point.
    expect(point(parent, 0)[3]).toBe(point(parent, 1)[3]);
  });

  it('replaces axon radii by the axon median in constant mode', () => {
    const m = parseSwc(`
      1 1 0 0 0 4 -1
      2 2 0 0 0 0.1 1
      3 2 -5 0 0 0.5 2
      4 2 -10 0 0 0.2 3
      5 3 0 0 0 1 1
      6 3 5 0 0 1.3 5
    `);
    const out = prepareMorphology(m, { ...OFF, axonRadius: 'constant' });
    const axon = out.sections.find((s) => s.type === SWC_AXON)!;
    expect(radii(axon)).toEqual([0.2, 0.2, 0.2, 0.2]);
    const dend = out.sections.find((s) => s.type === SWC_BASAL)!;
    expect(radii(dend)).toEqual([1, 1, 1.3]);
  });

  it('simplifies collinear runs but keeps corners and radius steps', () => {
    const line = parseSwc(straight(Array(10).fill(1)));
    expect(countPoints(prepareMorphology(line, { ...OFF, simplify: 0.5 }).sections)).toBe(2);

    const corner = parseSwc(
      ['1 1 0 0 0 3 -1', '2 3 0 0 0 1 1', '3 3 5 0 0 1 2', '4 3 5 5 0 1 3', '5 3 5 10 0 1 4'].join(
        '\n'
      )
    );
    const c = prepareMorphology(corner, { ...OFF, simplify: 0.5 }).sections[0];
    expect(c.points.length / 4).toBe(3);
    expect(point(c, 1).slice(0, 3)).toEqual([5, 0, 0]);

    const step = parseSwc(straight([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]));
    expect(
      countPoints(prepareMorphology(step, { ...OFF, simplify: 0.5 }).sections)
    ).toBeGreaterThanOrEqual(3);
    expect(countPoints(prepareMorphology(step, { ...OFF, simplify: 3 }).sections)).toBe(2);
  });

  describe('short sections', () => {
    // Soma at the origin, a dendrite along x at 1, 2, 3 µm: the section carries the soma point with the child's
    // radius, so its length is 3 µm and its end radii are r0 and r2.
    const short = (r0: number, r1: number, r2: number, type = SWC_BASAL) =>
      parseSwc(straight([r0, r1, r2], type));

    it('fires exactly when the length is below the sum of the end radii', () => {
      const fires = (m: ReturnType<typeof parseSwc>) =>
        trimShortSection(m.sections[0]) !== m.sections[0];
      expect(fires(short(1.4, 1, 1.5))).toBe(false); // 2.9 < 3
      expect(fires(short(1.5, 1, 1.5))).toBe(false); // equal is not below
      expect(fires(short(1.5, 1, 1.6))).toBe(true); // 3.1 > 3
      expect(fires(short(1.6, 1, 1.5))).toBe(true);
    });

    it('keeps the two ends as they are and drops everything between, even a sample fatter than both ends', () => {
      const m = short(1.5, 4, 1.6);
      const s = prepareMorphology(m, OFF).sections[0];
      expect(s.points.length / 4).toBe(2);
      expect(point(s, 0)).toEqual(point(m.sections[0], 0));
      expect(point(s, 1)).toEqual(point(m.sections[0], 3));
      expect([...s.nodes]).toEqual([m.sections[0].nodes[0], m.sections[0].nodes[3]]);
    });

    it('leaves a long section, a two-point section and an axon section alone', () => {
      const long = parseSwc(straight([0.2, 0.2, 0.2, 0.2, 0.2]));
      expect(trimShortSections(long.sections)).toBe(long.sections);
      const two = parseSwc(straight([5])); // the soma point and one node: short, but nothing to drop
      expect(two.sections[0].points.length / 4).toBe(2);
      expect(trimShortSection(two.sections[0])).toBe(two.sections[0]);
      const axon = short(1.5, 4, 1.6, SWC_AXON);
      expect(trimShortSection(axon.sections[0])).toBe(axon.sections[0]);
    });

    it('runs ahead of the simplification, which still runs', () => {
      // A straight run of 10 points forking into a short fat child (2 µm long, end radii 1 + 1.5) and a sibling:
      // the run is simplified to its ends in the same pass that trims the child.
      const fork = [
        '12 3 10 1 0 1.5 11',
        '13 3 10 1.5 0 4 12',
        '14 3 10 2 0 1.5 13',
        '15 3 10 -5 0 1 11',
      ];
      const m = parseSwc([straight(Array(10).fill(1)), ...fork].join('\n'));
      expect(m.sections).toHaveLength(3);
      const out = prepareMorphology(m, { ...OFF, simplify: 0.5 });
      expect(out.sections[0].points.length / 4).toBe(2);
      expect(out.sections[1].points.length / 4).toBe(2);
      expect(point(out.sections[1], 1).slice(0, 3)).toEqual([10, 2, 0]);
      // The simplification alone would have kept the fat middle sample: the axon twin shows it.
      const axon = prepareMorphology(short(1.5, 4, 1.6, SWC_AXON), { ...OFF, simplify: 0.5 });
      expect(axon.sections[0].points.length / 4).toBeGreaterThanOrEqual(3);
    });

    it('hits no section of the sample cell', () => {
      // Its shortest dendrite section is 1.2× the sum of its end radii (the projection neuron's 2.7×), so the rule
      // takes nothing off either cell and the page's mesh does not change.
      const m = sampleCell();
      expect(trimShortSections(m.sections)).toBe(m.sections);
      const smoothed = prepareMorphology(m, { smoothing: 1, axonRadius: 'heavy', simplify: 0 });
      expect(countPoints(smoothed.sections)).toBe(countPoints(m.sections));
    });
  });

  it('smooths and simplifies the sample cell into a closed, connected mesh with far fewer points', {
    timeout: SAMPLE_CELL_TIMEOUT,
  }, () => {
    const m = sampleCell();
    const prep: PrepareParams = { smoothing: 1, axonRadius: 'heavy', simplify: 0.25 };
    const out = prepareMorphology(m, prep);
    const raw = countPoints(m.sections),
      kept = countPoints(out.sections);
    expect(kept).toBeLessThan(0.6 * raw);
    expect(out.sections).toHaveLength(m.sections.length);

    const res = buildMesh(m, {
      voxel: 0.5,
      blend: 0.5,
      somaBlend: 1,
      minRadius: 0.5,
      includeTypes: null,
      simplifyMesh: 0,
      ...prep,
    });
    expect(res.stats.points).toBe(kept);
    expect(res.stats.rawPoints).toBe(raw);
    expect(res.stats.defects).toBe(0);
    const chk = checkMesh(res.positions, res.indices);
    expect(chk.closed).toBe(true);
    // The traced axon already yields an edge shared by four quads once in ~1.3 M
    // triangles (two sheets pinching in one cell); preparation must not add more.
    expect(chk.nonManifoldEdges).toBeLessThanOrEqual(Math.ceil(res.stats.triangles / 250_000));
    expect(connectedComponents(res.positions.length / 3, res.indices)).toBe(1);

    const sk = sectionSegments(out.sections, res.center);
    expect(sk.count).toBe(kept - out.sections.length);
    expect(sk.positions.length).toBe(6 * sk.count);
  });
});

describe('resampleFixedStep', () => {
  /** Soma plus one axon along x, one point per µm, with the given radii. */
  const axon = (rs: number[]) => parseSwc(straight(rs, SWC_AXON));
  const axonOf = (m: Morphology) => m.sections.find((s) => s.type === SWC_AXON)!;
  const spacings = (s: Section): number[] => {
    const out: number[] = [];
    for (let i = 1; i < s.points.length / 4; i++) {
      const a = point(s, i - 1),
        b = point(s, i);
      out.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    return out;
  };

  it('keeps the ends and spaces the points evenly, by no more than the step', () => {
    // 12 µm of axon (points at x = 1 … 12 after the soma point at 0): 3 steps of 4 µm.
    const m = axon(Array(12).fill(1));
    const out = prepareMorphology(m, { ...OFF, axonStep: 5 });
    const s = axonOf(out);
    expect(point(s, 0)).toEqual(point(axonOf(m), 0));
    expect(point(s, s.points.length / 4 - 1)).toEqual([12, 0, 0, 1]);
    expect(s.points.length / 4).toBe(4);
    for (const d of spacings(s)) expect(d).toBeCloseTo(4, 9);
    // Interior points belong to no node; the ends keep theirs.
    expect(s.nodes[0]).toBe(axonOf(m).nodes[0]);
    expect(s.nodes[3]).toBe(axonOf(m).nodes[12]);
    expect([...s.nodes.subarray(1, 3)]).toEqual([-1, -1]);
    // The step is honoured exactly on a length that divides.
    const t = axonOf(prepareMorphology(axon(Array(10).fill(1)), { ...OFF, axonStep: 2.5 }));
    expect(t.points.length / 4).toBe(5);
    for (const d of spacings(t)) expect(d).toBeCloseTo(2.5, 9);
  });

  it('interpolates the position along the traced path', () => {
    // A corner: 4 µm along x then 4 along y. A 5 µm step gives 2 steps of 4 µm, and the middle point is the corner.
    const m = parseSwc(
      ['1 1 0 0 0 3 -1', '2 2 0 0 0 1 1', '3 2 4 0 0 1 2', '4 2 4 4 0 1 3'].join('\n')
    );
    const s = axonOf(prepareMorphology(m, { ...OFF, axonStep: 5 }));
    expect(s.points.length / 4).toBe(3);
    expect(point(s, 1).slice(0, 3)).toEqual([4, 0, 0]);
    // 3 steps of 8/3 µm: the first lands 2/3 of the way along the first leg, the second 1/3 up the other.
    const u = resampleFixedStep(axonOf(m), 3);
    expect(u.points.length / 4).toBe(4);
    expect(point(u, 1)[0]).toBeCloseTo(8 / 3, 9);
    expect(point(u, 1)[1]).toBeCloseTo(0, 9);
    expect(point(u, 2)[0]).toBeCloseTo(4, 9);
    expect(point(u, 2)[1]).toBeCloseTo(4 / 3, 9);
  });

  it('gives every new point the arc-length-weighted mean radius over its step', () => {
    // Radii alternating 0.5 / 1.5 every micron: a point sample at a step of 4 µm would read 1.5 every time,
    // and the mean over the 4 µm (two periods) around each new point is 1.
    const rs = Array.from({ length: 20 }, (_, i) => (i % 2 ? 1.5 : 0.5));
    const s = axonOf(prepareMorphology(axon(rs), { ...OFF, axonStep: 4 }));
    expect(s.points.length / 4).toBe(6);
    for (let i = 1; i < 5; i++) {
      expect(point(s, i)[0]).toBeCloseTo(4 * i, 9);
      expect(point(s, i)[3]).toBeCloseTo(1, 9);
    }
    // The ends keep their own radius.
    expect(point(s, 0)[3]).toBe(0.5);
    expect(point(s, 5)[3]).toBe(1.5);
    // A radius step at x = 10 in 20 µm: the point on the step averages both halves, the others sit on one side.
    const t = axonOf(
      prepareMorphology(axon([...Array(10).fill(1), ...Array(10).fill(2)]), { ...OFF, axonStep: 5 })
    );
    expect(point(t, 2)[0]).toBeCloseTo(10, 9);
    // Piecewise linear between the samples at 10 (r 1) and 11 (r 2): the window [7.5, 12.5] holds 2.5 µm of 1,
    // a micron ramping 1 → 2 (mean 1.5), and 1.5 µm of 2.
    expect(point(t, 2)[3]).toBeCloseTo((2.5 * 1 + 1 * 1.5 + 1.5 * 2) / 5, 9);
    expect(point(t, 1)[3]).toBeCloseTo(1, 9);
    expect(point(t, 3)[3]).toBeCloseTo(2, 9);
  });

  it('keeps only the two ends of a section shorter than the step', () => {
    const s = axonOf(prepareMorphology(axon([1, 1.2, 0.8, 1]), { ...OFF, axonStep: 5 }));
    expect(s.points.length / 4).toBe(2);
    expect(point(s, 0).slice(0, 3)).toEqual([0, 0, 0]);
    expect(point(s, 1)).toEqual([4, 0, 0, 1]);
    // Exactly one step long: still two ends.
    expect(
      axonOf(prepareMorphology(axon([1, 1, 1, 1, 1]), { ...OFF, axonStep: 5 })).points.length / 4
    ).toBe(2);
    // Two points cannot be resampled.
    const two = axonOf(axon([1]));
    expect(resampleFixedStep(two, 5)).toBe(two);
  });

  it('leaves dendrites alone, and does nothing at step 0', () => {
    const m = parseSwc(straight(Array(12).fill(1), SWC_BASAL));
    const out = prepareMorphology(m, { ...OFF, axonStep: 5 });
    expect(out.sections[0]).toBe(m.sections[0]);
    expect(prepareMorphology(m, { ...OFF, axonStep: 0 })).toBe(m);
  });

  it('keeps a child section starting where its resampled parent ends, after smoothing too', () => {
    // An axon of 12 µm forking at x = 12 into two 12 µm branches, with jitter for the smoothing to work on.
    const lines = ['1 1 0 0 0 3 -1'];
    let id = 2;
    for (let i = 1; i <= 12; i++)
      lines.push(`${id++} 2 ${i} ${i % 2 ? 0.2 : -0.2} 0 ${i % 3 ? 0.4 : 0.6} ${id - 2}`);
    const fork = id - 1;
    for (let i = 1; i <= 12; i++)
      lines.push(`${id++} 2 ${12 + i} ${i} 0 ${0.4} ${i === 1 ? fork : id - 2}`);
    for (let i = 1; i <= 12; i++)
      lines.push(`${id++} 2 ${12 + i} ${-i} 0 ${0.4} ${i === 1 ? fork : id - 2}`);
    const m = parseSwc(lines.join('\n'));
    for (const p of [
      { ...OFF, axonStep: 5 },
      { ...OFF, axonStep: 5, smoothing: 1 },
      { ...OFF, axonStep: 5, smoothing: 1, simplify: 0.1 },
    ]) {
      const out = prepareMorphology(m, p);
      const [parent, a, b] = out.sections;
      const end = point(parent, parent.points.length / 4 - 1);
      expect(point(a, 0)).toEqual(end);
      expect(point(b, 0)).toEqual(end);
      expect(end.slice(0, 3)).toEqual([12, -0.2, 0]);
      // 3 steps of ~4.3 µm on a zigzag of 12.9 µm; the simplification then straightens the smoothed chords out.
      if (!p.simplify) expect(parent.points.length / 4).toBe(4);
    }
  });
});
