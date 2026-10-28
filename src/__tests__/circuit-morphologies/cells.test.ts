// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  fillSomas,
  pageCells,
  renumberSegments,
  renumberSomas,
} from '@/features/circuit-viewer/morphologies/load/cells';

import type {
  CircuitMorphologyData,
  Population,
} from '@/features/circuit-viewer/morphologies/types';

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
  };
}

/** `data`'s, renumbered through `page`. */
function renumbered(page: Population[]) {
  const numbers = pageCells(PACKED, page);
  const { somas, populations } = renumberSomas(data(), numbers, page);
  return { somas, populations, ...renumberSegments(data(), numbers) };
}

describe('pageCells, renumberSomas and renumberSegments', () => {
  it('change no number where the page has the populations of the pack, in its order', () => {
    const packed = data();
    const segments = renumberSegments(packed, pageCells(PACKED, PACKED));

    const { somas, segmentCells } = renumbered(PACKED);
    expect(somas).toEqual(data().somas);
    expect(segmentCells).toEqual(data().segmentCells);
    expect(segments.segmentCells).toBe(packed.segmentCells);
    expect(segments.segments).toBe(packed.segments);
  });

  it('number the cells through the populations of the page', () => {
    const page = [
      { name: 'b', cells: 2 },
      { name: 'input', cells: 2 },
      { name: 'a', cells: 3 },
    ];
    const { populations, segmentCells, segments, somas } = renumbered(page);

    expect(populations).toBe(page);
    expect([...segmentCells]).toEqual([1, 4, 0, 5, 6]);
    expect(segments).toEqual(data().segments);
    expect([...somas]).toEqual([soma(3), soma(4), NONE, NONE, soma(0), soma(1), soma(2)].flat());
  });

  it('leave out the segments and somas of a population the page has none of', () => {
    const { segmentCells, segments, segmentTypes, somas } = renumbered([{ name: 'a', cells: 3 }]);

    expect([...segmentCells]).toEqual([0, 1, 2]);
    expect([...segments]).toEqual([1, 3, 4].flatMap(segment));
    expect([...segmentTypes]).toEqual([3, 2, 3]);
    expect(segments.buffer.byteLength).toBe(4 * 8 * 3);
    expect([...somas]).toEqual([soma(0), soma(1), soma(2)].flat());
  });

  it('leave out every segment where the page has none of the populations of the pack', () => {
    const { segmentCells, segments, somas } = renumbered([{ name: 'input', cells: 1 }]);

    expect(segmentCells.length).toBe(0);
    expect(segments.length).toBe(0);
    expect([...somas]).toEqual(NONE);
  });

  it('refuse a pack with a population the page has with another number of cells', () => {
    const page = [
      { name: 'a', cells: 4 },
      { name: 'b', cells: 2 },
    ];

    expect(() => pageCells(PACKED, page)).toThrow('3 cells in a, where the page has 4');
  });
});

describe('fillSomas', () => {
  /** Three cells, the second and third with no soma, about a centre. */
  function placed(): CircuitMorphologyData {
    return {
      ...data(),
      somas: Float32Array.from([soma(0), NONE, NONE].flat()),
      centre: [100, 200, 300],
      bounds: { min: [-5, 0, 0], max: [4, 14, 24] },
    };
  }

  it("gives a cell without a soma the page's position, about the centre, and the radius", () => {
    const filled = placed();
    fillSomas(filled, Float32Array.of(0, 0, 0, 101, 202, 303, 90, 250, 310), 6);

    expect([...filled.somas]).toEqual([soma(0), [1, 2, 3, 6], [-10, 50, 10, 6]].flat());
  });

  it('widens the bounds around the somas it places', () => {
    const filled = placed();
    fillSomas(filled, Float32Array.of(0, 0, 0, 101, 202, 303, 90, 250, 310), 6);

    expect(filled.bounds).toEqual({ min: [-16, -4, -3], max: [7, 56, 24] });
  });

  it('leaves a cell the page has no finite position for without a soma, and the bounds as they were', () => {
    const filled = placed();
    fillSomas(filled, Float32Array.of(0, 0, 0, NaN, 202, 303), 6);

    expect([...filled.somas]).toEqual([soma(0), NONE, NONE].flat());
    expect(filled.bounds).toEqual(placed().bounds);
  });
});
