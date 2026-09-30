// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildHybrid,
  type HybridParams,
  hybridLayout,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import { simplifierReady } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import {
  prepareMorphology,
  untangleReport,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/prepare';
import {
  parseSwc,
  type Section,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import {
  UNTANGLE_VOXELS,
  untangleSections,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/untangle';

import { checkMesh, connectedComponents, degrees, params as testParams } from './mesh-utils';

const OPTIONS = { clearance: 0.25, blend: 0.5, somaBlend: 1 };

const params = (over: Partial<HybridParams> = {}): HybridParams =>
  testParams({ voxel: 0.1, simplifyMesh: 0.05, ...over });

/** A line of points a micron apart from a to b, as SWC rows of one type, the first with `parent`. */
function line(
  id: number,
  type: number,
  a: number[],
  b: number[],
  r: number,
  parent: number
): string {
  const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  const rows: string[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    rows.push(
      `${id + k} ${type} ${a[0] + (b[0] - a[0]) * t} ${a[1] + (b[1] - a[1]) * t} ${a[2] + (b[2] - a[2]) * t} ${r} ${k === 0 ? parent : id + k - 1}`
    );
  }
  return rows.join('\n');
}

/** The least distance between the surfaces of two sections, by their segments. */
function gap(a: Section, b: Section): number {
  let least = Infinity;
  const P = a.points,
    Q = b.points;
  for (let i = 0; i + 4 < P.length; i += 4) {
    for (let j = 0; j + 4 < Q.length; j += 4) {
      // Sampled finely enough for segments of a micron and a half.
      for (let s = 0; s <= 1; s += 0.125) {
        for (let t = 0; t <= 1; t += 0.125) {
          const d = Math.hypot(
            P[i] + (P[i + 4] - P[i]) * s - Q[j] - (Q[j + 4] - Q[j]) * t,
            P[i + 1] + (P[i + 5] - P[i + 1]) * s - Q[j + 1] - (Q[j + 5] - Q[j + 1]) * t,
            P[i + 2] + (P[i + 6] - P[i + 2]) * s - Q[j + 2] - (Q[j + 6] - Q[j + 2]) * t
          );
          least = Math.min(
            least,
            d - (P[i + 3] + (P[i + 7] - P[i + 3]) * s) - (Q[j + 3] + (Q[j + 7] - Q[j + 3]) * t)
          );
        }
      }
    }
  }
  return least;
}

/** The sharpest turn between consecutive segments of a section, in degrees. */
function sharpestTurn(sec: Section): number {
  const p = sec.points;
  let worst = 0;
  for (let k = 4; k + 4 < p.length; k += 4) {
    const u = [p[k] - p[k - 4], p[k + 1] - p[k - 3], p[k + 2] - p[k - 2]],
      v = [p[k + 4] - p[k], p[k + 5] - p[k + 1], p[k + 6] - p[k + 2]];
    const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
    worst = Math.max(worst, degrees(c));
  }
  return worst;
}

beforeAll(() => simplifierReady);

describe('untangleSections', () => {
  it('parts two fibres alike that cross through each other, each by half the way, and leaves their ends alone', () => {
    // Axes 0.6 µm apart where they cross: surfaces 0.4 µm into each other.
    const m = parseSwc(
      [
        line(1, 3, [-20, 0, 0], [20, 0, 0], 0.5, -1),
        line(100, 2, [0, -20, 0.6], [0, 20, 0.6], 0.5, -1),
      ].join('\n')
    );
    expect(gap(m.sections[0], m.sections[1])).toBeCloseTo(-0.4, 6);
    const { sections, report } = untangleSections(m, m.sections, OPTIONS);
    expect(report.contacts).toBe(1);
    expect(report.left).toBe(0);
    expect(gap(sections[0], sections[1])).toBeGreaterThan(OPTIONS.clearance - 0.01);
    expect(gap(sections[0], sections[1])).toBeLessThan(OPTIONS.clearance + 0.05);
    // 0.65 µm are wanting; each goes about half of it, straight up and down, and nowhere else.
    expect(report.maxShift).toBeGreaterThan(0.3);
    expect(report.maxShift).toBeLessThan(0.4);
    for (const [s, sign] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const p = sections[s].points,
        q = m.sections[s].points;
      for (const end of [0, p.length - 4])
        for (let d = 0; d < 3; d++) expect(p[end + d]).toBe(q[(end === 0 ? 0 : q.length - 4) + d]);
      let most = 0;
      for (let k = 0; k < p.length; k += 4) {
        const z = p[k + 2] - (s === 0 ? 0 : 0.6);
        expect(sign * z).toBeGreaterThanOrEqual(-1e-9);
        most = Math.max(most, Math.abs(z));
        expect(Math.abs(s === 0 ? p[k + 1] : p[k])).toBeLessThan(1e-9);
      }
      expect(most).toBeCloseTo(report.maxShift, 2);
      // The way is spread over microns of path: no kink.
      expect(sharpestTurn(sections[s])).toBeLessThan(10);
    }
    // Far from the crossing nothing has moved.
    expect(report.movedLength).toBeLessThan(20);
  });

  it('finds a fibre that touches a fork only with its fillet, whatever cells the two fall in', () => {
    // What the fork looks up ends short of x = 8 and the stray fibre is listed from past it: in cells of their own,
    // 1.45 µm apart, closer than the radii, the clearance and the fork's fillet add up to.
    const m = parseSwc(
      [
        line(1, 3, [7.2, -10, 0], [7.2, 0, 0], 0.5, -1),
        line(20, 3, [7.2, 0.9, -0.45], [7.2, 10, -5], 0.5, 11),
        line(40, 3, [7.2, 0.9, 0.45], [7.2, 10, 5], 0.5, 11),
        line(100, 2, [8.65, -10, 0], [8.65, 10, 0], 0.5, -1),
      ].join('\n')
    );
    const { report } = untangleSections(m, m.sections, OPTIONS);
    expect(report.contacts).toBeGreaterThan(0);
  });

  it('sends a thin fibre around a thick one that it goes through the middle of', () => {
    const m = parseSwc(
      [
        line(1, 3, [-20, 0, 0], [20, 0, 0], 1.5, -1),
        line(100, 2, [0, -20, 0], [0, 20, 0], 0.1, -1),
      ].join('\n')
    );
    const { sections, report } = untangleSections(m, m.sections, OPTIONS);
    expect(report.left).toBe(0);
    expect(gap(sections[0], sections[1])).toBeGreaterThan(OPTIONS.clearance - 0.01);
    // The dendrite gives way by a two-hundredth of what the axon does.
    let thick = 0,
      thin = 0;
    for (let k = 0; k < sections[0].points.length; k += 4)
      thick = Math.max(thick, Math.abs(sections[0].points[k + 2]));
    for (let k = 0; k < sections[1].points.length; k += 4)
      thin = Math.max(thin, Math.abs(sections[1].points[k + 2]));
    expect(thin).toBeGreaterThan(1.8);
    expect(thin).toBeLessThan(2);
    expect(thick).toBeLessThan(0.02);
    expect(sharpestTurn(sections[1])).toBeLessThan(25);
  });

  it('keeps a fibre that lies in another to one side of it all the way', () => {
    // A thin fibre along a thick one's axis for 30 µm, now a little to one side of it and now to the other.
    const rows = [line(1, 3, [-10, 0, 0], [50, 0, 0], 1, -1)];
    for (let k = 0; k <= 50; k++) {
      const x = -5 + k,
        inside = x >= 5 && x <= 35;
      rows.push(
        `${100 + k} 2 ${x} ${inside ? 0 : (x < 5 ? 5 - x : x - 35) * 0.8} ${inside ? (k % 2 === 0 ? 0.03 : -0.03) : 0} 0.1 ${k === 0 ? -1 : 99 + k}`
      );
    }
    const m = parseSwc(rows.join('\n'));
    const { sections, report } = untangleSections(m, m.sections, OPTIONS);
    expect(report.left).toBe(0);
    expect(gap(sections[0], sections[1])).toBeGreaterThan(OPTIONS.clearance - 0.01);
    // Where it was inside, it is now beside the dendrite, and on one side of it: it does not wind around.
    const p = sections[1].points;
    const sides: number[][] = [];
    for (let k = 0; k < p.length; k += 4) {
      if (p[k] < 8 || p[k] > 32) continue;
      const off = Math.hypot(p[k + 1], p[k + 2]);
      expect(off).toBeGreaterThan(1.3);
      sides.push([p[k + 1] / off, p[k + 2] / off]);
    }
    expect(sides.length).toBeGreaterThan(15);
    const mean = [0, 1].map((d) => sides.reduce((sum, v) => sum + v[d], 0) / sides.length);
    expect(Math.hypot(mean[0], mean[1])).toBeGreaterThan(0.95);
    for (const v of sides) expect(v[0] * mean[0] + v[1] * mean[1]).toBeGreaterThan(0.8);
    // It comes in and goes out at a slant, with a turn of 39°, and no turn is much sharper now.
    expect(sharpestTurn(m.sections[1])).toBeGreaterThan(38);
    expect(sharpestTurn(sections[1])).toBeLessThan(sharpestTurn(m.sections[1]) + 10);
  });

  it('leaves the branches of a fork to each other, however narrow', () => {
    const m = parseSwc(`
      1 3 0 0 0 0.5 -1
      2 3 20 0 0 0.5 1
      3 3 60 2 0 0.5 2
      4 3 60 -2 0 0.5 2
    `);
    const { sections, report } = untangleSections(m, m.sections, OPTIONS);
    expect(report.contacts).toBe(0);
    sections.forEach((sec, s) => expect(sec).toBe(m.sections[s]));
  });

  it('opens a loop of one section, and leaves a fold alone', () => {
    // Out along x, around, and back across the way it came, 30 µm of path later.
    const loop = parseSwc(
      [
        line(1, 2, [0, 0, 0], [20, 0, 0], 0.3, -1),
        line(30, 2, [21, 1, 0], [21, 9, 0], 0.3, 21),
        line(50, 2, [20, 10, 0], [10, 10, 0.1], 0.3, 38),
        line(70, 2, [10, 9, 0.1], [10, -10, 0.1], 0.3, 60),
      ].join('\n')
    );
    expect(loop.sections.length).toBe(1);
    const opened = untangleSections(loop, loop.sections, OPTIONS);
    expect(opened.report.contacts).toBe(1);
    expect(opened.report.left).toBe(0);
    expect(opened.report.maxShift).toBeGreaterThan(0.2);

    // Out and straight back, 0.2 µm beside itself.
    const fold = parseSwc(
      [
        line(1, 2, [0, 0, 0], [20, 0, 0], 0.3, -1),
        line(30, 2, [20, 0.2, 0], [0, 0.2, 0], 0.3, 21),
      ].join('\n')
    );
    const folded = untangleSections(fold, fold.sections, OPTIONS);
    expect(folded.report.maxShift).toBeLessThan(1);
  });
});

describe('untangling a morphology', () => {
  const crossed = [
    line(1, 3, [-20, 0, 0], [20, 0, 0], 0.5, -1),
    line(100, 2, [0, -20, 0.6], [0, 20, 0.6], 0.5, -1),
  ].join('\n');

  it('is off unless asked for, and reports what it did', () => {
    const m = parseSwc(crossed);
    expect(prepareMorphology(m, params())).toBe(m);
    const prepared = prepareMorphology(m, params({ untangle: UNTANGLE_VOXELS * 0.1 }));
    expect(untangleReport(prepared)).toEqual(expect.objectContaining({ contacts: 1, left: 0 }));
    expect(untangleReport(m)).toBeUndefined();
    // The same parameters, the same sections: they are kept.
    expect(prepareMorphology(m, params({ untangle: UNTANGLE_VOXELS * 0.1 })).sections[0]).toBe(
      prepared.sections[0]
    );
  });

  it('makes two tubes of two fibres that the tracing has crossing, where the mesher alone welds them', () => {
    const m = parseSwc(crossed);
    const welded = buildHybrid(m, params());
    expect(welded.stats.hybrid!.contacts).toBe(1);
    expect(connectedComponents(welded.positions.length / 3, welded.indices)).toBe(1);

    const p = params({ untangle: UNTANGLE_VOXELS * 0.1, simplify: 0.05 });
    expect(hybridLayout(prepareMorphology(m, p), p).layout.patches.length).toBe(0);
    const apart = buildHybrid(m, p);
    expect(apart.stats.hybrid!.contacts).toBe(0);
    expect(apart.stats.untangle!.contacts).toBe(1);
    expect(connectedComponents(apart.positions.length / 3, apart.indices)).toBe(2);
    expect(checkMesh(apart.positions, apart.indices).closed).toBe(true);
  });
});
