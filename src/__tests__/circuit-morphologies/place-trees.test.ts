import { describe, expect, it } from 'vitest';

import { placeTrees } from '@/features/circuit-viewer/morphologies/load/place-trees';

import type { TreeCells } from '@/features/circuit-viewer/morphologies/load/place-trees';
import type { TreeMorphology } from '@/features/circuit-viewer/morphologies/load/tree';

/** A soma 5 µm round at the origin and one segment along x from 5 to 15 µm. */
function morphology(soma: TreeMorphology['soma'] = [0, 0, 0, 5]): TreeMorphology {
  return {
    segments: Float32Array.of(5, 0, 0, 1, 15, 0, 0, 0.5),
    segmentTypes: Uint8Array.of(3),
    segmentSections: Uint32Array.of(1),
    soma,
    sections: [],
  };
}

/** Three cells of one population, and a fourth of another that has no position. */
function cells(orientations: Float32Array | null = null): TreeCells {
  return {
    somas: {
      positions: Float32Array.of(100, 0, 0, 200, 0, 0, 300, 50, 0, NaN, NaN, NaN),
      populations: [
        { name: 'A', cells: 3 },
        { name: 'B', cells: 1 },
      ],
    },
    orientations,
    placeholderRadius: 8,
  };
}

const rounded = (values: ArrayLike<number>) =>
  Array.from(values, (value) => Math.round(value * 1000) / 1000 + 0);

describe('a small circuit placed', () => {
  it("draws a cell's morphology turned and moved to its place, less the centre", () => {
    // A quarter turn about z for cell 2: x becomes y.
    const quarter = Math.SQRT1_2;
    const turns = new Float32Array(16);
    turns.set([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, quarter, quarter]);
    const data = placeTrees(cells(turns), [morphology(), undefined, morphology()], [200, 0, 0]);
    expect(rounded(data.segments)).toEqual([
      ...[-95, 0, 0, 1, -85, 0, 0, 0.5],
      ...[100, 55, 0, 1, 100, 65, 0, 0.5],
    ]);
    expect(Array.from(data.segmentCells)).toEqual([0, 2]);
    expect(Array.from(data.segmentTypes)).toEqual([3, 3]);
    expect(data.centre).toEqual([200, 0, 0]);
  });

  it('draws a cell with no morphology, or none yet, as a soma as wide as told at its position', () => {
    const data = placeTrees(cells(), [morphology(), null], [0, 0, 0]);
    expect(rounded(data.somas.subarray(0, 12))).toEqual([
      ...[100, 0, 0, 5],
      ...[200, 0, 0, 8],
      ...[300, 50, 0, 8],
    ]);
    expect(Array.from(data.somas.subarray(12))).toEqual([NaN, NaN, NaN, 0]);
  });

  it('draws no soma for a morphology without one, nor anything for a cell that has no position', () => {
    const data = placeTrees(
      cells(),
      [morphology(null), undefined, undefined, morphology()],
      [0, 0, 0]
    );
    expect(Number.isNaN(data.somas[0])).toBe(true);
    expect(Array.from(data.segmentCells)).toEqual([0]);
    expect(data.trees?.morphologies[3]).toBeNull();
  });

  it("keeps each cell's morphology and where its segments start", () => {
    const tree = morphology();
    const data = placeTrees(cells(), [undefined, tree, tree], [0, 0, 0]);
    expect(data.trees?.morphologies).toEqual([null, tree, tree, null]);
    expect(data.trees?.morphologies[1]).toBe(tree);
    expect(Array.from(data.trees?.firstSegments ?? [])).toEqual([0, 0, 1, 2]);
  });

  it('takes a rotation that is not of unit length as one that is, and none for one of no length', () => {
    const twice = new Float32Array(16);
    twice.set([0, 0, 0, 0, 0, 0, 0, 2]);
    const data = placeTrees(cells(twice), [morphology(), morphology()], [0, 0, 0]);
    expect(rounded(data.segments)).toEqual([
      ...[105, 0, 0, 1, 115, 0, 0, 0.5],
      ...[205, 0, 0, 1, 215, 0, 0, 0.5],
    ]);
  });

  it('places a dendrogram as its morphology is placed, a cell with none standing in it as it is', () => {
    const plain = morphology();
    const charted: TreeMorphology = {
      ...morphology(),
      chart: { segments: Float32Array.of(0, 0, 0, 0.5, 0, 100, 0, 0.5), soma: [0, -5, 0, 3] },
    };
    const data = placeTrees(cells(), [charted, plain], [0, 0, 0]);
    expect(rounded(data.chart?.segments ?? [])).toEqual([
      ...[100, 0, 0, 0.5, 100, 100, 0, 0.5],
      ...[205, 0, 0, 1, 215, 0, 0, 0.5],
    ]);
    expect(rounded(data.chart?.somas.subarray(0, 12) ?? [])).toEqual([
      ...[100, -5, 0, 3],
      ...[200, 0, 0, 5],
      ...[300, 50, 0, 8],
    ]);
    // Bounded round both, which the view goes between.
    expect(data.bounds.max[1]).toBe(100.5);
    expect(placeTrees(cells(), [plain], [0, 0, 0]).chart).toBeUndefined();
  });

  it("is bounded round every segment and soma drawn, of every point, and of the page's populations", () => {
    const given = cells();
    const data = placeTrees(given, [morphology()], [0, 0, 0]);
    expect(data.bounds).toEqual({ min: [95, -8, -8], max: [308, 58, 8] });
    expect(data.level).toEqual({ toleranceUm: 0, pruneUm: 0 });
    expect(data.populations).toBe(given.somas.populations);
  });
});
