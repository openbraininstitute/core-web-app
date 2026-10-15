/**
 * The packs in `fixtures` are written by OBI-One's `morphology_pack` library as of obi-one#1101 (`6a55a82b`), and the
 * JSON beside each is what OBI-One's own reader gets from it. A segment is there in whole numbers: its cell, its section
 * type, then x, y, z in steps of the grid and the radius in its own steps, for the near end and for the far end.
 *
 * - `small`: two made-up morphologies as five cells of two populations, at three levels. Cell 2 is a soma alone,
 *   outside the others' box, and cell 3 has no position.
 * - `wide`: the first and the last of 70,000 cells, with segments long enough for streams three and four bytes wide.
 * - `somas-only`: three cells with no morphology, one of them with no position.
 * - `two-cells`: what the endpoint sends for a circuit of two real cells. Every 61st segment is in the JSON.
 */
import { readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

import { openPack } from '@/features/circuit-viewer/morphologies/load/pack';

import type {
  CircuitMorphologyData,
  MorphologySegments,
} from '@/features/circuit-viewer/morphologies/types';

export const HEADER_BYTES = 12;
const file = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
export const pack = (name: string) => new Uint8Array(file(`${name}.pack`));
export const expected = (name: string) => JSON.parse(file(`${name}.json`).toString());

export const indexEnd = (bytes: Uint8Array) =>
  HEADER_BYTES + new DataView(bytes.buffer, bytes.byteOffset).getUint32(8, true);

export interface Index {
  layout: string;
  populations: { cells: number }[];
  somas: { offset: number; bytes: number };
  levels: {
    segments: number;
    offset: number;
    chunkSteps: number;
    chunks: { box: number[]; bytes: number[]; segments: number[] };
  }[];
}

export const indexOf = (bytes: Uint8Array): Index =>
  JSON.parse(inflateSync(bytes.subarray(HEADER_BYTES, indexEnd(bytes))).toString());

/** Boxes' segments one after another. */
export function joined(parts: MorphologySegments[]): MorphologySegments {
  const total = parts.reduce((sum, part) => sum + part.segmentCells.length, 0);
  const all: MorphologySegments = {
    segments: new Float32Array(8 * total),
    segmentCells: new Uint32Array(total),
    segmentTypes: new Uint8Array(total),
  };
  let first = 0;
  for (const { segments, segmentCells, segmentTypes } of parts) {
    all.segments.set(segments, 8 * first);
    all.segmentCells.set(segmentCells, first);
    all.segmentTypes.set(segmentTypes, first);
    first += segmentCells.length;
  }
  return all;
}

/** One level of a pack, whole, its boxes one after another. The first is the finest. */
export async function readPack(bytes: Uint8Array, levelNumber = 0): Promise<CircuitMorphologyData> {
  const pack = await openPack(bytes);
  const level = pack.levels[levelNumber];
  if (!level) throw new RangeError(`morphology pack without a level ${levelNumber}`);
  const parts: MorphologySegments[] = [];
  for (let box = 0; box < level.segments.length; box++) {
    parts.push(await pack.readBox(levelNumber, box));
  }
  const { toleranceUm, pruneUm } = level;
  return { ...pack.data, ...joined(parts), level: { toleranceUm, pruneUm } };
}

export function withIndex(bytes: Uint8Array, change: (index: Index) => void): Uint8Array {
  const index = indexOf(bytes);
  change(index);
  const deflated = deflateSync(JSON.stringify(index));
  const changed = Buffer.concat([
    bytes.subarray(0, HEADER_BYTES),
    deflated,
    bytes.subarray(indexEnd(bytes)),
  ]);
  changed.writeUInt32LE(deflated.length, 8);
  return changed;
}
