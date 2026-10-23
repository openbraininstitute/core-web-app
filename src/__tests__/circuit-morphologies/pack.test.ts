// @vitest-environment node
import { deflateSync, inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { Arriving } from '@/features/circuit-viewer/morphologies/load/arriving';
import { openPack, PackError } from '@/features/circuit-viewer/morphologies/load/pack';

import {
  COUNTS_BYTES,
  expected,
  HEADER_BYTES,
  type Index,
  indexEnd,
  indexOf,
  pack,
  readPack,
  withIndex,
} from './packs';

import type { CircuitMorphologyData } from '@/features/circuit-viewer/morphologies/types';

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

/** The pack with the first chunk of a level changed. */
function withChunk(bytes: Uint8Array, change: Change, level = 0): Uint8Array {
  const { offset, chunks } = indexOf(bytes).levels[level];
  return withBlock(bytes, offset, chunks.bytes[0], change, (index, changed) => {
    index.levels[level].chunks.bytes[0] = changed;
  });
}

/**
 * Where a chunk has the length of its first run: past the base's counts and the inner points' four streams, in the
 * third stream a run.
 */
function firstLength(chunk: Buffer): number {
  const [base, inner, runs] = [0, 4, 8].map((at) => chunk.readUInt32LE(at));
  let at = COUNTS_BYTES;
  for (const count of [base, inner, inner, inner, inner, runs, runs]) at += 1 + chunk[at] * count;
  return at + 1;
}

/** Each level's segments, sorted, as the JSON has them. */
const sorted = (rows: number[][]) => rows.map((row) => row.join()).sort();

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
      // Boxes are numbered by the first level's chunks, so another level's may come in another order.
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
    expect(everySegment(data, want)).toEqual(want.levels[0].segments);
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

    const sample = want.sample.map((_: number[], n: number) =>
      inSteps(data, n * want.sampleEvery, want)
    );
    expect(sample).toEqual(want.sample);
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
  it("keeps each population's box of each section type, round its points of the first level", async () => {
    const data = await readPack(pack('small'));
    const ends: Record<string, Record<string, number[][]>> = { excitatory: {}, inhibitory: {} };
    data.segmentCells.forEach((cell, i) => {
      // Cells 0 to 2 are excitatory, 3 and 4 inhibitory.
      const own = ends[cell < 3 ? 'excitatory' : 'inhibitory'];
      own[data.segmentTypes[i]] ??= [];
      own[data.segmentTypes[i]].push([...data.segments.subarray(8 * i, 8 * i + 3)]);
      own[data.segmentTypes[i]].push([...data.segments.subarray(8 * i + 4, 8 * i + 7)]);
    });
    const near = (points: number[][], pick: (...values: number[]) => number) =>
      [0, 1, 2].map((k) => expect.closeTo(pick(...points.map((point) => point[k])), 3));
    const want = Object.fromEntries(
      Object.entries(ends).map(([name, types]) => [
        name,
        Object.fromEntries(
          Object.entries(types).map(([type, points]) => [
            type,
            { min: near(points, Math.min), max: near(points, Math.max) },
          ])
        ),
      ])
    );
    expect(Object.values(want).every((types) => Object.keys(types).length > 0)).toBe(true);
    expect(data.boxes).toEqual(want);
  });

  it('reads a pack written before populations had boxes, and the fields of the index it does not know', async () => {
    const bytes = withIndex(pack('small'), (index) => {
      for (const population of index.populations) {
        delete population.boxes;
        Object.assign(population, { later: 1 });
      }
      Object.assign(index, { later: { any: 'thing' } });
    });
    const data = await readPack(bytes);
    expect(data.boxes).toBeUndefined();
    expect(data.populations).toEqual(expected('small').populations);
    expect(data.segments).toEqual((await readPack(pack('small'))).segments);
  });

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

  it("puts both ends of each segment in its box, and counts each box's segments", async () => {
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
          for (const end of [0, 4]) {
            for (let k = 0; k < 3; k++) {
              const at = read.segments[8 * i + end + k];
              expect(at).toBeGreaterThanOrEqual(boxes[6 * box + k] - 1e-3);
              expect(at).toBeLessThanOrEqual(boxes[6 * box + 3 + k] + 1e-3);
            }
          }
        }
        total += level.segments[box];
      }
      expect(total).toBe(expected('small').levels[number].segments.length);
    }
  });

  it('grows a box by as far as its chunks reach', async () => {
    const reaching = (reach: number) =>
      openPack(
        withIndex(pack('small'), (index) => {
          for (const { chunks } of index.levels) chunks.reach.fill(0);
          index.levels[0].chunks.reach[0] = reach;
        })
      );
    const [cubes, grown] = await Promise.all([reaching(0), reaching(400)]);
    const by = 400 * expected('small').gridUm;
    const { chunkSteps } = indexOf(pack('small')).levels[0];
    // The boxes are numbered by the first level's chunks.
    // In µm as float32: to the nanometre.
    const nm = (um: number) => Math.round(um * 1000) / 1000;
    expect(Array.from(grown.boxes, (at, i) => nm(at - cubes.boxes[i]))).toEqual(
      Array.from(grown.boxes, (_, i) => (i >= 6 ? 0 : i < 3 ? -by : by))
    );
    for (let i = 0; i < cubes.boxes.length; i += 6) {
      expect(cubes.boxes[i + 3] - cubes.boxes[i]).toBeCloseTo(
        chunkSteps * expected('small').gridUm,
        3
      );
    }
  });

  it('reads a level over its base, whether the base was read before or not', async () => {
    const cold = await openPack(pack('small'));
    const warm = await openPack(pack('small'));
    for (let box = 0; box < cold.boxes.length / 6; box++) await warm.readBox(1, box);
    for (let box = 0; box < cold.boxes.length / 6; box++) {
      const [first, again] = await Promise.all([cold.readBox(0, box), warm.readBox(0, box)]);
      expect(again).toEqual(first);
    }
  });

  it('hands over a box with nothing at a level as arrays of its own', async () => {
    const bytes = withIndex(pack('small'), (index) => {
      const [finest] = index.levels;
      finest.segments -= finest.chunks.segments.pop() ?? 0;
      finest.chunks.bytes.pop();
      finest.chunks.reach.pop();
      finest.chunks.box.splice(-3);
    });
    const opened = await openPack(bytes);
    const empty = opened.levels[0].segments.indexOf(0);
    expect(empty).toBeGreaterThanOrEqual(0);
    const [one, other] = await Promise.all([opened.readBox(0, empty), opened.readBox(0, empty)]);
    expect(one.segmentCells).toHaveLength(0);
    expect(one.segmentCells.buffer).not.toBe(other.segmentCells.buffer);
    expect(one.segments.buffer).not.toBe(other.segments.buffer);
  });

  it('hands over a box of a base kept for the finer levels as a copy', async () => {
    const opened = await openPack(pack('small'));
    const box = Array.from(opened.levels[1].segments).findIndex((n) => n > 0);
    const read = await opened.readBox(1, box);
    const cells = read.segmentCells.slice();
    read.segmentCells.fill(9);
    expect((await opened.readBox(1, box)).segmentCells).toEqual(cells);
    expect(await opened.readBox(0, box)).toEqual(
      await (await openPack(pack('small'))).readBox(0, box)
    );
  });

  it('reads only the boxes there are', async () => {
    const opened = await openPack(pack('small'));
    await expect(opened.readBox(0, opened.boxes.length / 6)).rejects.toThrow(RangeError);
    await expect(opened.readBox(3, 0)).rejects.toThrow('at level 3');
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
    // The file's last chunk, the finest level's last: its box is refused at that level alone, and the others are whole.
    const lastByteGone = await openPack(bytes.subarray(0, bytes.length - 1));
    const refused: number[] = [];
    for (let box = 0; box < lastByteGone.boxes.length / 6; box++) {
      await lastByteGone.readBox(0, box).then(
        () => {},
        (e) => {
          expect(e.message).toContain('cut short');
          refused.push(box);
        }
      );
    }
    expect(refused).toHaveLength(1);
    for (const level of [1, 2]) {
      expect((await lastByteGone.readBox(level, refused[0])).segmentCells.length).toBeGreaterThan(
        0
      );
    }
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
    const twice = withIndex(pack('small'), (index) => {
      const { box } = index.levels[0].chunks;
      box.splice(3, 3, ...box.slice(0, 3));
    });
    await expect(openPack(twice)).rejects.toThrow('at odds with its index');
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
      (chunk) => chunk.fill(0, COUNTS_BYTES, COUNTS_BYTES + 1),
    ];
    for (const change of changes) {
      await expect(readPack(withChunk(pack('small'), change))).rejects.toThrow('cut short');
    }
  });

  it('refuses a chunk whose runs are not as long as it is', async () => {
    for (const by of [-1, 1]) {
      const bytes = withChunk(
        pack('small'),
        (chunk) => {
          chunk[firstLength(chunk)] += by;
          return chunk;
        },
        2
      );
      await expect(readPack(bytes, 2)).rejects.toThrow('at odds with its index');
      await expect(readPack(bytes, 0)).rejects.toThrow('at odds with its index');
    }
  });

  it('refuses a chunk whose segments follow more or fewer of the base than are in its box', async () => {
    const bytes = withChunk(pack('small'), (chunk) => {
      chunk.writeUInt32LE(chunk.readUInt32LE(0) + 1, 0);
      return chunk;
    });
    await expect(readPack(bytes)).rejects.toThrow('at odds with its index');
  });

  it('refuses levels read over a level that is not coarser, or cut in other chunks', async () => {
    for (const base of [0, 1, 3]) {
      const bytes = withIndex(pack('small'), (index) => {
        index.levels[1].base = base;
      });
      await expect(openPack(bytes)).rejects.toThrow('at odds with its index');
    }
    const halved = withIndex(pack('small'), (index) => {
      const level = index.levels[1];
      level.chunkSteps /= 2;
      level.chunks.box = level.chunks.box.map((at) => 2 * at);
    });
    await expect(openPack(halved)).rejects.toThrow('at odds with its index');
  });

  it('refuses a chunk with bytes after its streams', async () => {
    const bytes = withChunk(pack('small'), (chunk) => Buffer.concat([chunk, Buffer.alloc(8)]));
    await expect(readPack(bytes)).rejects.toThrow('bytes left over');
  });

  it('refuses a block that does not inflate', async () => {
    const bytes = pack('small');
    bytes.fill(0xff, bytes.length - 40);
    await expect(readPack(bytes, 0)).rejects.toThrow('damaged block');
    await expect(readPack(bytes, 0)).rejects.toThrow(PackError);
    const noIndex = pack('small');
    new DataView(noIndex.buffer).setUint32(8, 0, true);
    await expect(readPack(noIndex)).rejects.toThrow('damaged block');
  });
});

describe('a pack still coming in', () => {
  /** Long enough for every read the bytes in let go on to end, inflating included. */
  const settled = () => new Promise((resolve) => setTimeout(resolve, 20));

  /** `promise`, and whether it has settled. */
  function watched<T>(promise: Promise<T>) {
    const watch = { promise, done: false };
    const done = () => {
      watch.done = true;
    };
    promise.then(done, done);
    return watch;
  }

  /** The box of `small` that needs the most of the file at its finest level. */
  async function lastBox(bytes: Uint8Array) {
    const whole = await openPack(bytes);
    const finest = whole.readableAt[0];
    return { whole, box: finest.indexOf(Math.max(...finest)) };
  }

  it('opens once its somas are in, before its chunks, as it opens whole', async () => {
    const bytes = pack('small');
    const index = indexOf(bytes);
    const somasEnd = indexEnd(bytes) + index.somas.offset + index.somas.bytes;
    const file = new Arriving(bytes.byteLength);
    const opening = watched(openPack(file));

    for (let at = 0; at < somasEnd - 1; at += 7) {
      file.add(bytes.subarray(at, Math.min(at + 7, somasEnd - 1)));
    }
    await settled();
    expect(opening.done).toBe(false);
    file.add(bytes.subarray(somasEnd - 1, somasEnd));
    const opened = await opening.promise;

    const whole = await openPack(bytes);
    expect(opened.data).toEqual(whole.data);
    expect(opened.boxes).toEqual(whole.boxes);
    expect(opened.readableAt).toEqual(whole.readableAt);
  });

  it('says how much of the file each box needs in at each level, its bases first', async () => {
    const bytes = pack('small');
    const { levels } = indexOf(bytes);
    const { readableAt, boxes } = await openPack(bytes);

    const ends = levels.map(
      ({ offset, chunks }) => indexEnd(bytes) + offset + chunks.bytes.reduce((a, b) => a + b, 0)
    );
    expect(ends[2]).toBeLessThan(ends[1]);
    expect(ends[1]).toBeLessThan(ends[0]);
    expect(ends[0]).toBe(bytes.byteLength);
    for (let box = 0; box < boxes.length / 6; box++) {
      expect(readableAt[2][box]).toBeLessThanOrEqual(ends[2]);
      expect(readableAt[1][box]).toBeGreaterThanOrEqual(readableAt[2][box]);
      expect(readableAt[0][box]).toBeGreaterThanOrEqual(readableAt[1][box]);
    }
    expect(Math.max(...readableAt[0])).toBe(bytes.byteLength);
  });

  it('reads a box once its bytes and its bases have come, and not before', async () => {
    const bytes = pack('small');
    const { whole, box } = await lastBox(bytes);
    const { readableAt } = whole;
    const file = new Arriving(bytes.byteLength);
    file.add(bytes.subarray(0, readableAt[2][box]));
    const opened = await openPack(file);

    const base = watched(opened.readBox(2, box));
    const finest = watched(opened.readBox(0, box));
    await settled();
    expect(base.done).toBe(true);
    expect(finest.done).toBe(false);

    file.add(bytes.subarray(readableAt[2][box], readableAt[0][box] - 1));
    await settled();
    expect(finest.done).toBe(false);
    file.add(bytes.subarray(readableAt[0][box] - 1));
    expect(await finest.promise).toEqual(await whole.readBox(0, box));
    expect(await base.promise).toEqual(await whole.readBox(2, box));
  });

  it('refuses what waits for bytes once the file ends without them', async () => {
    const bytes = pack('small');
    const { whole, box } = await lastBox(bytes);
    const file = new Arriving(bytes.byteLength);
    file.add(bytes.subarray(0, Math.max(...whole.readableAt[2])));
    const opened = await openPack(file);
    const finest = opened.readBox(0, box);

    file.end();
    await expect(finest).rejects.toThrow('cut short');
    expect((await opened.readBox(2, box)).segmentCells.length).toBeGreaterThan(0);
  });
});

describe('Arriving', () => {
  it('grows where the file is longer than said, and keeps what came', async () => {
    const file = new Arriving(2);
    const waiting = file.until(5);
    file.add(Uint8Array.of(1, 2, 3));
    file.add(Uint8Array.of(4, 5));
    await expect(waiting).resolves.toBe(true);
    expect([...file.all]).toEqual([1, 2, 3, 4, 5]);
    expect([...file.bytes(1, 4)]).toEqual([2, 3, 4]);
  });

  it('tells what waits past its end that it will not come, and what is in that it has', async () => {
    const file = new Arriving(0);
    const past = file.until(4);
    file.add(Uint8Array.of(1, 2));
    file.end();
    await expect(past).resolves.toBe(false);
    await expect(file.until(2)).resolves.toBe(true);
    await expect(file.until(3)).resolves.toBe(false);
  });
});
