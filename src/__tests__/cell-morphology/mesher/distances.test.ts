// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  nodeDistances,
  PathDistances,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/distances';
import { meshCenter } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { sectionSegments } from '@/features/entities/cell-morphology/morpho-viewer/engine/prepare';
import {
  parseSwc,
  SWC_AXON,
  SWC_BASAL,
  SWC_SOMA,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { BRANCHED } from './mesh-utils';

/** A dendrite along x and an axon that crosses it at x = 20, 5 µm above the soma. */
const CROSSING = `
  1 1 0 0 0 5 -1
  2 3 10 0 0 1 1
  3 3 20 0 0 1 2
  4 3 30 0 0 1 3
  5 2 0 5 0 0.5 1
  6 2 20 5 0 0.5 5
  7 2 20 -40 0 0.5 6
`;

function paths(swc: string) {
  const m = parseSwc(swc);
  return { m, paths: new PathDistances(m, meshCenter(m)) };
}

describe('path distances to the soma', () => {
  it('adds up the segments from the soma, in any order of the file', () => {
    const inOrder = nodeDistances(parseSwc(BRANCHED));
    expect(Array.from(inOrder)).toEqual([
      0,
      0,
      10,
      10 + Math.hypot(10, 5),
      10 + Math.hypot(10, 5),
      10 + Math.hypot(10, 5) + Math.hypot(10, 3),
      0,
      Math.hypot(15, 3),
    ]);
    const lines = BRANCHED.trim().split('\n');
    const reversed = nodeDistances(parseSwc(lines.reverse().join('\n')));
    expect(Array.from(reversed).reverse()).toEqual(Array.from(inOrder));
  });

  it('puts every point of a contour soma at 0, and starts a neurite from the point it leaves', () => {
    const d = nodeDistances(
      parseSwc(`
        1 1 0 0 0 1 -1
        2 1 10 0 0 1 1
        3 1 10 10 0 1 2
        4 3 10 30 0 1 3
      `)
    );
    expect(Array.from(d)).toEqual([0, 0, 0, 20]);
  });

  it('cuts a loop in a broken file instead of hanging', () => {
    const m = parseSwc(`
      1 3 0 0 0 1 3
      2 3 10 0 0 1 1
      3 3 20 0 0 1 2
    `);
    const d = nodeDistances(m);
    expect(d.every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
  });

  it('ends the ramp at the farthest node, the axon included', () => {
    expect(paths(CROSSING).paths.max).toBeCloseTo(5 + 20 + 45);
  });

  it('gives a vertex beside a node the distance of that node, and one along a segment what lies between', () => {
    const { paths: p } = paths(CROSSING);
    const vertices = new Float32Array([20, 0, 1, 15, 0, -1, 30, 1, 0]);
    const d = p.atPoints(vertices, new Uint8Array([SWC_BASAL, SWC_BASAL, SWC_BASAL]));
    expect(d[0]).toBeCloseTo(20);
    expect(d[1]).toBeCloseTo(15);
    expect(d[2]).toBeCloseTo(30);
  });

  it('measures a vertex where an axon crosses a dendrite along its own type', () => {
    const { paths: p } = paths(CROSSING);
    const atCrossing = new Float32Array([20, 0, 0.5, 20, 0, 0.5]);
    const [dendrite, axon] = p.atPoints(atCrossing, new Uint8Array([SWC_BASAL, SWC_AXON]));
    expect(dendrite).toBeCloseTo(20);
    expect(axon).toBeCloseTo(5 + 20 + 5);
  });

  it('puts the soma at 0, and a type without sections too', () => {
    const { paths: p } = paths(CROSSING);
    const d = p.atPoints(new Float32Array([4, 0, 0, 20, 0, 0]), new Uint8Array([SWC_SOMA, 4]));
    expect(Array.from(d)).toEqual([0, 0]);
  });

  it('finds a segment far outside the grid cells it searches first', () => {
    const { paths: p } = paths(CROSSING);
    const [d] = p.atPoints(new Float32Array([30, 500, 0]), new Uint8Array([SWC_BASAL]));
    expect(d).toBeCloseTo(30);
  });

  it('measures a skeleton overlay at the middle of each segment', () => {
    const { m, paths: p } = paths(BRANCHED);
    const skeleton = sectionSegments(m.sections, meshCenter(m));
    const d = p.ofSkeleton(skeleton);
    expect(d).toHaveLength(skeleton.count);
    const nodes = nodeDistances(m);
    let k = 0;
    for (const s of m.sections) {
      for (let i = 1; i < s.nodes.length; i++, k++) {
        expect(d[k]).toBeCloseTo((nodes[s.nodes[i - 1]] + nodes[s.nodes[i]]) / 2, 4);
      }
    }
  });
});
