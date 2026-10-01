// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  parseSwc,
  SWC_APICAL,
  SWC_AXON,
  SWC_BASAL,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { sampleSwc } from './mesh-utils';

const SAMPLE = sampleSwc();

describe('parseSwc', () => {
  it('parses the sample morphology', () => {
    const m = parseSwc(SAMPLE);
    expect(m.nodeCount).toBe(25200);
    expect(m.soma.model).toBe('three-point');
    expect(m.soma.radius).toBeCloseTo(3.738, 3);
    expect(m.soma.center).toEqual([8137.5, 941.475, 8176.475]);

    const byType = new Map<number, number>();
    for (const s of m.sections) byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
    expect(byType.get(SWC_AXON)).toBeGreaterThan(100);
    expect(byType.get(SWC_BASAL)).toBeGreaterThan(5);
    expect(byType.get(SWC_APICAL)).toBeGreaterThan(5);

    // Every non-soma node appears in exactly one section as a non-start point.
    const seen = new Uint8Array(m.nodeCount);
    for (const s of m.sections) {
      for (let k = 1; k < s.nodes.length; k++) {
        expect(seen[s.nodes[k]]).toBe(0);
        seen[s.nodes[k]] = 1;
      }
    }
    for (let i = 0; i < m.nodeCount; i++) if (m.types[i] !== 1) expect(seen[i]).toBe(1);

    // Cable lengths agree with the raw parent links (within rounding).
    expect(m.cableLength.get(SWC_AXON)!).toBeCloseTo(27576, -1);
  });

  it("gives a soma-attached section the child's radius at its start", () => {
    const m = parseSwc(`
      1 1 0 0 0 5 -1
      2 3 0 0 0 0.5 1
      3 3 10 0 0 0.4 2
    `);
    expect(m.soma.model).toBe('point');
    expect(m.sections).toHaveLength(1);
    const p = m.sections[0].points;
    expect(p.length).toBe(12);
    expect(p[3]).toBe(0.5);
  });

  it('splits sections at branch points and type changes', () => {
    const m = parseSwc(`
      1 1 0 0 0 5 -1
      2 3 5 0 0 1 1
      3 3 10 0 0 1 2
      4 3 15 5 0 0.5 3
      5 3 15 -5 0 0.5 3
      6 4 20 -5 0 0.5 5
    `);
    expect(m.sections.map((s) => [s.type, s.nodes.length])).toEqual([
      [3, 3],
      [3, 2],
      [3, 2],
      [4, 2],
    ]);
  });

  it('fits a sphere to a contour soma', () => {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push(
        `${i + 1} 1 ${(4 * Math.cos(a)).toFixed(4)} ${(4 * Math.sin(a)).toFixed(4)} 0 0.2 ${i === 0 ? -1 : i}`
      );
    }
    const m = parseSwc(pts.join('\n'));
    expect(m.soma.model).toBe('fit');
    expect(m.soma.radius).toBeCloseTo(4, 3);
    expect(m.soma.center[0]).toBeCloseTo(0, 6);
  });

  it('rejects malformed lines', () => {
    expect(() => parseSwc('1 1 0 0 0')).toThrow(/7 columns/);
    expect(() => parseSwc('# only comments\n')).toThrow(/no sample points/);
  });

  it('reads lines ended the classic Mac way, with a bare carriage return', () => {
    const m = parseSwc('1 1 0 0 0 5 -1\r2 3 10 0 0 1 1\r3 3 20 0 0 1 2\r');
    expect(m.nodeCount).toBe(3);
    expect(m.cableLength.get(3)).toBeCloseTo(20 - 0, 6);
  });

  it('rejects a sample id given twice, saying where', () => {
    expect(() => parseSwc('1 1 0 0 0 5 -1\n2 3 10 0 0 1 1\n2 3 20 0 0 1 1')).toThrow(
      'SWC line 3: sample 2 is on line 2 too'
    );
  });

  it('rejects parents that lead back round, which would leave their samples out', () => {
    expect(() =>
      parseSwc('1 1 0 0 0 5 -1\n2 3 10 0 0 1 4\n3 3 20 0 0 1 2\n4 3 30 0 0 1 3')
    ).toThrow(/parents lead back/);
  });
});
