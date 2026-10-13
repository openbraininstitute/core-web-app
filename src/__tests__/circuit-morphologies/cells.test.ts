// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { renumberCells } from '@/features/circuit-viewer/morphologies/load/cells';

import type { CircuitMorphologyData } from '@/features/circuit-viewer/morphologies/types';

const PACKED = [
  { name: 'a', cells: 3 },
  { name: 'b', cells: 2 },
];

const soma = (n: number) => [n, 10 + n, 20 + n, 1 + n];
const NONE = [NaN, NaN, NaN, 0];
/** Segment `n`'s eight floats: 8n to 8n + 7. */
const segment = (n: number) => Array.from({ length: 8 }, (_, i) => 8 * n + i);

/** As the reader gives it: `a` then `b`, and a segment a cell. */
function data(): CircuitMorphologyData {
  return {
    segments: Float32Array.from([0, 1, 2, 3, 4].flatMap(segment)),
    segmentCells: Uint32Array.of(4, 0, 3, 1, 2),
    segmentTypes: Uint8Array.of(2, 3, 4, 2, 3),
    somas: Float32Array.from([0, 1, 2, 3, 4].flatMap(soma)),
    populations: PACKED,
    centre: [0, 0, 0],
    bounds: { min: [0, 0, 0], max: [4, 14, 24] },
    level: { toleranceUm: 0.125, pruneUm: 0 },
  };
}

describe('renumberCells', () => {
  it('changes no number where the page has the populations of the pack, in its order', () => {
    const packed = data();
    const renumbered = renumberCells(packed, PACKED);

    expect(renumbered).toEqual(data());
    expect(renumbered.segmentCells).toBe(packed.segmentCells);
    expect(renumbered.segments).toBe(packed.segments);
  });

  it('numbers the cells through the populations of the page', () => {
    const page = [
      { name: 'b', cells: 2 },
      { name: 'input', cells: 2 },
      { name: 'a', cells: 3 },
    ];
    const renumbered = renumberCells(data(), page);

    expect(renumbered.populations).toBe(page);
    expect([...renumbered.segmentCells]).toEqual([1, 4, 0, 5, 6]);
    expect(renumbered.segments).toEqual(data().segments);
    expect([...renumbered.somas]).toEqual(
      [soma(3), soma(4), NONE, NONE, soma(0), soma(1), soma(2)].flat()
    );
  });

  it('leaves out the segments of a population the page has none of', () => {
    const renumbered = renumberCells(data(), [{ name: 'a', cells: 3 }]);

    expect([...renumbered.segmentCells]).toEqual([0, 1, 2]);
    expect([...renumbered.segments]).toEqual([1, 3, 4].flatMap(segment));
    expect([...renumbered.segmentTypes]).toEqual([3, 2, 3]);
    expect(renumbered.segments.buffer.byteLength).toBe(4 * 8 * 3);
    expect([...renumbered.somas]).toEqual([soma(0), soma(1), soma(2)].flat());
    expect(renumbered.bounds).toEqual(data().bounds);
  });

  it('leaves out every segment where the page has none of the populations of the pack', () => {
    const renumbered = renumberCells(data(), [{ name: 'input', cells: 1 }]);

    expect(renumbered.segmentCells.length).toBe(0);
    expect(renumbered.segments.length).toBe(0);
    expect([...renumbered.somas]).toEqual(NONE);
  });

  it('refuses a pack with a population the page has with another number of cells', () => {
    const page = [
      { name: 'a', cells: 4 },
      { name: 'b', cells: 2 },
    ];

    expect(() => renumberCells(data(), page)).toThrow('3 cells in a, where the page has 4');
  });
});
