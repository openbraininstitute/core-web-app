// @vitest-environment node
import { deflateSync, inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { mortonOrder, openPack, PackError } from '@/features/circuit-viewer/morphologies/load/pack';

import {
  expected,
  HEADER_BYTES,
  type Index,
  indexEnd,
  indexOf,
  pack,
  readPack,
  withIndex,
} from './packs';

import type {
  CircuitMorphologyData,
  MorphologySegments,
} from '@/features/circuit-viewer/morphologies/types';

type Change = (inflated: Buffer) => Uint8Array;

/** The pack with the block of `size` bytes at `offset` changed, and `resize` writing its new size in the index. */
function withBlock(
  bytes: Uint8Array,
  offset: number,
  size: number,
  change: Change,
  resize: (index: Index, size: number) => void
): Uint8Array {
  const from = indexEnd(bytes) + offset;
  const deflated = deflateSync(change(inflateSync(bytes.subarray(from, from + size))));
  const changed = Buffer.concat([bytes.subarray(0, from), deflated, bytes.subarray(from + size)]);
  return withIndex(changed, (index) => {
    resize(index, deflated.length);
    for (const level of index.levels) {
      if (level.offset > offset) level.offset += deflated.length - size;
    }
  });
}

function withSomas(bytes: Uint8Array, change: Change): Uint8Array {
  const { offset, bytes: size } = indexOf(bytes).somas;
  return withBlock(bytes, offset, size, change, (index, changed) => {
    index.somas.bytes = changed;
  });
}

/** The pack with the first chunk of its first level changed. */
function withChunk(bytes: Uint8Array, change: Change): Uint8Array {
  const { offset, chunks } = indexOf(bytes).levels[0];
  return withBlock(bytes, offset, chunks.bytes[0], change, (index, changed) => {
    index.levels[0].chunks.bytes[0] = changed;
  });
}

/** Where a chunk has the length of its first run: in its third stream, a number a run. */
function firstLength(chunk: Buffer): number {
  const runs = chunk.readUInt32LE(0);
  let at = 8;
  for (let stream = 0; stream < 2; stream++) at += 1 + chunk[at] * runs;
  return at + 1;
}

interface Grid {
  gridUm: number;
  radiusSteps: number;
}

/** Segment `i` as the JSON has it. */
function inSteps(data: CircuitMorphologyData, i: number, { gridUm, radiusSteps }: Grid) {
  const ends = Array.from(data.segments.subarray(8 * i, 8 * i + 8), (value, k) =>
    k % 4 === 3
      ? Math.round(Math.log2(value) * radiusSteps)
      : Math.round((value + data.centre[k % 4]) / gridUm)
  );
  return [data.segmentCells[i], data.segmentTypes[i], ...ends];
}

const everySegment = (data: CircuitMorphologyData, grid: Grid) =>
  Array.from(data.segmentCells, (_, i) => inSteps(data, i, grid));

/** Rows in an order of their own: a box's segments come in the Morton order of their midpoints, not the pack's. */
const sorted = (rows: number[][]) => rows.map((row) => row.join()).sort();

/** The somas of `want`, by cell, are where the pack has them in the circuit's frame. */
function expectSomas(
  data: CircuitMorphologyData,
  want: Record<string, number[]> | number[][],
  digits: number
) {
  for (const [cell, soma] of Object.entries(want)) {
    soma.forEach((value, k) => {
      const read = data.somas[4 * Number(cell) + k] + (k < 3 ? data.centre[k] : 0);
      expect(read).toBeCloseTo(value, digits);
    });
  }
}

describe('a level read box by box', () => {
  it("reads every segment of every level as OBI-One's reader does", async () => {
    const want = expected('small');
    const { centre } = await readPack(pack('small'));
    expect(want.levels).toHaveLength(3);
    for (const [number, level] of want.levels.entries()) {
      const data = await readPack(pack('small'), number);
      expect(sorted(everySegment(data, want))).toEqual(sorted(level.segments));
      expect(data.level).toEqual({ toleranceUm: level.toleranceUm, pruneUm: level.pruneUm });
      expect(data.populations).toEqual(want.populations);
      expect(data.centre).toEqual(centre);
    }
  });

  it('reads the first level unless another is asked for', async () => {
    const data = await readPack(pack('small'));
    expect(data.level).toEqual({ toleranceUm: 0.125, pruneUm: 0 });
    await expect(readPack(pack('small'), 3)).rejects.toThrow('without a level 3');
  });

  it('reads streams three and four bytes wide', async () => {
    const want = expected('wide');
    const data = await readPack(pack('wide'));
    expect(sorted(everySegment(data, want))).toEqual(sorted(want.levels[0].segments));
    expect(new Set(data.segmentCells)).toEqual(new Set([0, 69_999]));
    expectSomas(data, want.somasOf, 1);
  });

  it('reads what the endpoint sends for a circuit', async () => {
    const want = expected('two-cells');
    const data = await readPack(pack('two-cells'));
    const count = want.level.segments;
    expect(data.segments).toHaveLength(8 * count);
    expect(data.segmentCells).toHaveLength(count);
    expect(data.segmentTypes).toHaveLength(count);

    const ofCell = want.segmentsOfCell.map(() => 0);
    const ofType: Record<string, number> = {};
    let lengthUm = 0;
    for (let i = 0; i < count; i++) {
      ofCell[data.segmentCells[i]]++;
      ofType[data.segmentTypes[i]] = (ofType[data.segmentTypes[i]] ?? 0) + 1;
      const [x0, y0, z0, , x1, y1, z1] = data.segments.subarray(8 * i, 8 * i + 8);
      lengthUm += Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    }
    expect(ofCell).toEqual(want.segmentsOfCell);
    expect(ofType).toEqual(want.segmentsOfType);
    expect(lengthUm / want.lengthUm).toBeCloseTo(1, 5);

    const read = new Set(sorted(everySegment(data, want)));
    for (const row of sorted(want.sample)) expect(read).toContain(row);
    expectSomas(data, want.somas, 3);
  });

  it('gives a cell with no morphology a soma with no radius', async () => {
    const { somas } = expected('small');
    const data = await readPack(pack('small'));
    expect(somas[2][3]).toBe(0);
    expectSomas(data, { 2: somas[2] }, 3);
    expect(data.somas[4 * 0 + 3]).toBeCloseTo(6, 5);
    expect(new Set(data.segmentCells)).toEqual(new Set([0, 1, 4]));
  });

  it('keeps a soma with no position, out of the bounds', async () => {
    const data = await readPack(pack('small'));
    expect(Array.from(data.somas.subarray(12, 15))).toEqual([NaN, NaN, NaN]);
    expect([...data.centre, ...data.bounds.min, ...data.bounds.max].every(Number.isFinite)).toBe(
      true
    );
  });

  it('counts a position with a number missing as no position', async () => {
    const bytes = withSomas(pack('somas-only'), (somas) => {
      somas.writeFloatLE(Infinity, 4);
      return somas;
    });
    const data = await readPack(bytes);
    expect(Array.from(data.somas.subarray(0, 3))).toEqual([NaN, NaN, NaN]);
    expect(data.centre).toEqual([-50, 0, 5]);
  });

  it('centres on the box of the segments and the somas', async () => {
    const { gridUm, bounds, somas } = expected('small');
    const data = await readPack(pack('small'));
    const placed: number[][] = somas.filter((soma: (number | null)[]) => soma[0] !== null);
    // The soma alone lies past the segments.
    expect(somas[2][0]).toBeGreaterThan(bounds[1][0] * gridUm);
    for (let k = 0; k < 3; k++) {
      const lowest = Math.min(bounds[0][k] * gridUm, ...placed.map((soma) => soma[k]));
      const highest = Math.max(bounds[1][k] * gridUm, ...placed.map((soma) => soma[k]));
      expect(data.centre[k]).toBeCloseTo((lowest + highest) / 2, 6);
      expect(data.bounds.max[k]).toBeCloseTo(highest - data.centre[k], 6);
      expect(data.bounds.min[k]).toBeCloseTo(-data.bounds.max[k], 6);
    }
    for (let i = 0; i < data.segments.length; i++) {
      if (i % 4 === 3) continue;
      expect(Math.abs(data.segments[i])).toBeLessThanOrEqual(data.bounds.max[i % 4] + 1e-3);
    }
  });

  it('reads a pack with no segments, centred on its somas', async () => {
    const data = await readPack(pack('somas-only'));
    expect(data.segments).toHaveLength(0);
    expect(data.centre).toEqual([-20, 10, 17.5]);
    expect(data.bounds).toEqual({ min: [-30, -10, -12.5], max: [30, 10, 12.5] });
    expect(Array.from(data.somas.subarray(0, 8))).toEqual([30, 10, 12.5, 0, -30, -10, -12.5, 0]);
  });

  it('centres a pack with no position at all on the origin', async () => {
    const nowhere = new Uint8Array(new Float32Array(12).fill(NaN).buffer);
    const data = await readPack(withSomas(pack('somas-only'), () => nowhere));
    expect(data.centre).toEqual([0, 0, 0]);
    expect(data.bounds).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
  });
});

describe('openPack', () => {
  it('reads nothing of the segments, and the somas and frame as a whole level has them', async () => {
    const opened = await openPack(pack('small'));
    const whole = await readPack(pack('small'));
    expect(opened.data.segmentCells).toHaveLength(0);
    expect(opened.data.somas).toEqual(whole.somas);
    expect(opened.data.centre).toEqual(whole.centre);
    expect(opened.data.bounds).toEqual(whole.bounds);
    const levelOf = ({ toleranceUm, pruneUm }: CircuitMorphologyData['level']) => ({
      toleranceUm,
      pruneUm,
    });
    expect(opened.levels.map(levelOf)).toEqual(expected('small').levels.map(levelOf));
  });

  it("puts each segment's far end in its box, and counts each box's segments", async () => {
    const opened = await openPack(pack('small'));
    const { boxes } = opened;
    expect(boxes.length % 6).toBe(0);
    for (const [number, level] of opened.levels.entries()) {
      expect(level.segments).toHaveLength(boxes.length / 6);
      let total = 0;
      for (let box = 0; box < level.segments.length; box++) {
        const read = await opened.readBox(number, box);
        expect(read.segmentCells).toHaveLength(level.segments[box]);
        for (let i = 0; i < read.segmentCells.length; i++) {
          for (let k = 0; k < 3; k++) {
            const far = read.segments[8 * i + 4 + k];
            expect(far).toBeGreaterThanOrEqual(boxes[6 * box + k] - 1e-3);
            expect(far).toBeLessThanOrEqual(boxes[6 * box + 3 + k] + 1e-3);
          }
        }
        total += level.segments[box];
      }
      expect(total).toBe(expected('small').levels[number].segments.length);
    }
  });

  it('gathers a level cut finer in the boxes of the coarsest', async () => {
    const want = expected('small');
    // The second level on a grid of half the steps: its chunks and segments stay where they were.
    const halved = withIndex(pack('small'), (index) => {
      const level = index.levels[1];
      level.chunkSteps /= 2;
      level.chunks.box = level.chunks.box.map((at) => 2 * at);
    });
    const opened = await openPack(halved);
    expect(opened.boxes).toEqual((await openPack(pack('small'))).boxes);
    const data = await readPack(halved, 1);
    expect(sorted(everySegment(data, want))).toEqual(sorted(want.levels[1].segments));
  });

  it('reads only the boxes there are', async () => {
    const opened = await openPack(pack('small'));
    await expect(opened.readBox(0, opened.boxes.length / 6)).rejects.toThrow(RangeError);
    await expect(opened.readBox(3, 0)).rejects.toThrow('at level 3');
  });
});

describe('mortonOrder', () => {
  /** A segment a point, from it to a micrometre along x, each of a cell and a type of its own. */
  const segmentsFrom = (points: number[][]): MorphologySegments => ({
    segments: Float32Array.from(points.flatMap(([x, y, z]) => [x, y, z, 1, x + 1, y, z, 2])),
    segmentCells: Uint32Array.from(points, (_, i) => 10 + i),
    segmentTypes: Uint8Array.from(points, (_, i) => i + 1),
  });

  it('orders segments by their midpoints, x, y then z at each step, each with its cell and type', () => {
    const corners = [
      [0, 10, 10],
      [10, 0, 0],
      [10, 10, 0],
      [0, 0, 10],
      [0, 0, 0],
      [10, 0, 10],
      [0, 10, 0],
      [10, 10, 10],
    ];
    const out = mortonOrder(segmentsFrom(corners));
    const starts = Array.from(out.segmentCells, (_, i) =>
      Array.from(out.segments.subarray(8 * i, 8 * i + 3))
    );
    expect(starts).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [0, 10, 0],
      [10, 10, 0],
      [0, 0, 10],
      [10, 0, 10],
      [0, 10, 10],
      [10, 10, 10],
    ]);
    starts.forEach(([x, y, z], i) => {
      const was = corners.findIndex((corner) => corner.join() === [x, y, z].join());
      expect(out.segmentCells[i]).toBe(10 + was);
      expect(out.segmentTypes[i]).toBe(was + 1);
      expect(Array.from(out.segments.subarray(8 * i + 3, 8 * i + 8))).toEqual([1, x + 1, y, z, 2]);
    });
  });

  it('leaves a single segment as it is', () => {
    const one = segmentsFrom([[1, 2, 3]]);
    expect(mortonOrder(one)).toBe(one);
  });
});

describe('openPack and readBox, of what is not a pack they read', () => {
  it('refuses another file', async () => {
    const text = new TextEncoder().encode('{"detail": "the circuit has too many neurons"}');
    await expect(readPack(text)).rejects.toThrow('not a morphology pack');
    await expect(readPack(text)).rejects.toThrow(PackError);
    await expect(readPack(new Uint8Array(4))).rejects.toThrow('not a morphology pack');
  });

  it('refuses another version', async () => {
    const bytes = pack('small');
    new DataView(bytes.buffer).setUint16(4, 2, true);
    await expect(readPack(bytes)).rejects.toThrow('morphology pack version 2');
  });

  it('refuses another layout', async () => {
    const bytes = withIndex(pack('small'), (index) => {
      index.layout = 'morphology';
    });
    await expect(readPack(bytes)).rejects.toThrow('laid out by morphology');
  });

  it('refuses a pack cut short, wherever', async () => {
    const bytes = pack('small');
    const end = indexEnd(bytes);
    for (const length of [HEADER_BYTES, end - 1, end + 1]) {
      await expect(readPack(bytes.subarray(0, length))).rejects.toThrow('cut short');
    }
    // The last level's last chunk: the levels before it are whole.
    const lastByteGone = bytes.subarray(0, bytes.length - 1);
    await expect(readPack(lastByteGone, 2)).rejects.toThrow('cut short');
    expect((await readPack(lastByteGone, 1)).segments.length).toBeGreaterThan(0);
  });

  it('refuses a chunk that is not what the index says', async () => {
    const moved = withIndex(pack('small'), (index) => {
      const { segments } = index.levels[0].chunks;
      segments[0] += 1;
      segments[1] -= 1;
    });
    await expect(readPack(moved)).rejects.toThrow('at odds with its index');
    const fewer = withIndex(pack('small'), (index) => {
      index.levels[0].segments -= 1;
    });
    await expect(readPack(fewer)).rejects.toThrow('at odds with its index');
  });

  it('refuses a cell beyond the populations', async () => {
    const fourCells = withSomas(pack('small'), (somas) => somas.subarray(0, 4 * 16));
    const bytes = withIndex(fourCells, (index) => {
      index.populations[1].cells = 1;
    });
    await expect(readPack(bytes)).rejects.toThrow('at odds with its index');
    await expect(readPack(bytes, 2)).rejects.toThrow('at odds with its index');
  });

  it('refuses somas that are not one a cell', async () => {
    const bytes = withIndex(pack('small'), (index) => {
      index.populations[0].cells += 1;
    });
    await expect(readPack(bytes)).rejects.toThrow('at odds with its index');
  });

  it('refuses an index that is not as the format has it', async () => {
    const noLevels = withIndex(pack('small'), (index) => {
      index.levels = [];
    });
    await expect(readPack(noLevels)).rejects.toThrow('malformed index');
    const before = withIndex(pack('small'), (index) => {
      index.somas.offset = -8;
    });
    await expect(readPack(before)).rejects.toThrow('malformed index');
  });

  it('refuses a chunk cut short', async () => {
    const changes: Change[] = [
      (chunk) => chunk.subarray(0, 4),
      (chunk) => chunk.subarray(0, chunk.length - 1),
      // No stream is no bytes wide.
      (chunk) => chunk.fill(0, 8, 9),
    ];
    for (const change of changes) {
      await expect(readPack(withChunk(pack('small'), change))).rejects.toThrow('cut short');
    }
  });

  it('refuses a chunk whose runs are not as long as it is', async () => {
    for (const by of [-1, 1]) {
      const bytes = withChunk(pack('small'), (chunk) => {
        chunk[firstLength(chunk)] += by;
        return chunk;
      });
      await expect(readPack(bytes)).rejects.toThrow('at odds with its index');
    }
  });

  it('refuses a chunk with bytes after its streams', async () => {
    const bytes = withChunk(pack('small'), (chunk) => Buffer.concat([chunk, Buffer.alloc(8)]));
    await expect(readPack(bytes)).rejects.toThrow('bytes left over');
  });

  it('refuses a block that does not inflate', async () => {
    const bytes = pack('small');
    bytes.fill(0xff, bytes.length - 40);
    await expect(readPack(bytes, 2)).rejects.toThrow('damaged block');
    await expect(readPack(bytes, 2)).rejects.toThrow(PackError);
    const noIndex = pack('small');
    new DataView(noIndex.buffer).setUint32(8, 0, true);
    await expect(readPack(noIndex)).rejects.toThrow('damaged block');
  });
});
