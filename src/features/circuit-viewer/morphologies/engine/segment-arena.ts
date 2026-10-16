import * as THREE from 'three';

import { HOLE_WORD, packCellTypes, QUAD_REACH, segmentAttributes } from './impostors';

import type { MorphologySegments } from '../types';

/** The bytes a segment takes on the GPU: its two ends, and its cell and type in a word. */
export const SEGMENT_BYTES = 8 * 4 + 4;
/** The segments the culling tests together, whose box it tests first. */
export const BLOCK = 64;

/** The room `segments` take in an arena: a whole number of blocks. */
export const roomFor = (segments: number) => Math.ceil(segments / BLOCK) * BLOCK;
/** Where the block that `slot` starts is in the blocks' array. */
const rowOf = (slot: number) => (8 * slot) / BLOCK;

/**
 * Where an arena's arrays are uploaded: told of the segments that changed and always of the blocks over them;
 * `wordsOnly` leaves out the segments' ends, never the blocks.
 */
export interface ArenaUploads {
  upload(start: number, count: number, wordsOnly: boolean): void;
  dispose(): void;
}

/**
 * An arena's uploads for its segments' ends (8 floats each), their cell-and-type words, and its blocks (8 words each:
 * the least x, y and z of their box, their first segment, the greatest x, y and z, and their segments).
 */
export type UploadsOf = (
  ends: Float32Array,
  words: Uint32Array,
  blocks: Float32Array
) => ArenaUploads;

const NO_UPLOADS: ArenaUploads = { upload() {}, dispose() {} };

/** three's attributes on the quads `geometry`, which three uploads where they changed. */
function attributesOf(
  geometry: THREE.InstancedBufferGeometry,
  ends: Float32Array,
  words: Uint32Array
): ArenaUploads {
  const endsBuffer = new THREE.InstancedInterleavedBuffer(ends, 8);
  const cellTypes = new THREE.InstancedBufferAttribute(words, 1);
  // No dendrogram: the ends stand for it, and the morph moves nothing.
  segmentAttributes(geometry, endsBuffer, endsBuffer, cellTypes);
  return {
    upload(start: number, count: number, wordsOnly: boolean) {
      if (!wordsOnly) {
        endsBuffer.addUpdateRange(8 * start, 8 * count);
        endsBuffer.needsUpdate = true;
      }
      cellTypes.addUpdateRange(start, count);
      cellTypes.needsUpdate = true;
    },
    dispose() {},
  };
}

interface Place {
  start: number;
  count: number;
}

/**
 * The segments of the boxes drawn, as the segments' quads take them, in arrays of a fixed number of segments drawn up
 * to the last box. A box's segments lie together, from the start of a block of `BLOCK`, its last block filled out with
 * holes. A box let go of leaves a hole, its segments' type `HOLE`, which the shaders draw nothing of; the smallest hole
 * a box fits in takes it, or else the end, and where neither has room every box is moved down to close the holes. Each
 * block has the box its segments are drawn in, empty where it has no segment. Only what changed before the end is
 * uploaded (`ArenaUploads`), so what reads the blocks reads none past it.
 */
export class SegmentArena {
  readonly geometry: THREE.InstancedBufferGeometry;
  readonly capacity: number;
  private ends: Float32Array;
  private words: Uint32Array;
  private blocks: Float32Array;
  private blockWords: Uint32Array;
  private uploads: ArenaUploads;
  private uploadsOf?: UploadsOf;
  private places = new Map<number, Place>();
  /** By where they start, none touching another or the end. */
  private holes: Place[] = [];
  /** Where the last box's room ends: what is drawn. */
  private end = 0;
  private live = 0;
  private used = 0;

  /**
   * `geometry` is the segments' quad, drawn as many times as the arena has segments up to its last box; `capacity` is
   * taken to a whole number of blocks; without `uploadsOf`, the arrays are three's attributes on `geometry`.
   */
  constructor(geometry: THREE.InstancedBufferGeometry, capacity: number, uploadsOf?: UploadsOf) {
    this.geometry = geometry;
    this.capacity = roomFor(capacity);
    this.ends = new Float32Array(8 * this.capacity);
    this.words = new Uint32Array(this.capacity);
    this.blocks = new Float32Array(rowOf(this.capacity));
    this.blockWords = new Uint32Array(this.blocks.buffer);
    this.uploadsOf = uploadsOf;
    this.uploads = uploadsOf
      ? uploadsOf(this.ends, this.words, this.blocks)
      : attributesOf(geometry, this.ends, this.words);
    geometry.instanceCount = 0;
  }

  /** An empty arena of `capacity` on `geometry`, uploaded as this one is. */
  remade(geometry: THREE.InstancedBufferGeometry, capacity: number): SegmentArena {
    return new SegmentArena(geometry, capacity, this.uploadsOf);
  }

  /** The segments of the boxes drawn, holes left out. */
  get segments(): number {
    return this.live;
  }

  /** The room no box takes. */
  get free(): number {
    return this.capacity - this.used;
  }

  /** The segments of `box` drawn; undefined where it is not. */
  sizeOf(box: number): number | undefined {
    return this.places.get(box)?.count;
  }

  /** The room `box` takes more with `segments` drawn in place of what it has. */
  growthOf(box: number, segments: number): number {
    return roomFor(segments) - roomFor(this.sizeOf(box) ?? 0);
  }

  /**
   * `box`'s segments drawn; it must not be drawn already, and they must fit. What was uploaded, in segments: their
   * room, and every box's where the holes had to be closed.
   */
  put(box: number, { segments, segmentCells, segmentTypes }: MorphologySegments): number {
    const n = segmentCells.length;
    const room = roomFor(n);
    if (this.places.has(box)) throw new Error(`box ${box} is drawn already`);
    if (room > this.free) throw new RangeError(`room for ${room}, where ${this.free} are free`);
    let start = this.take(room);
    let uploaded = room;
    if (start === null) {
      uploaded += this.compact();
      start = this.end;
      this.end += room;
    }
    this.ends.set(segments, 8 * start);
    packCellTypes(segmentCells, segmentTypes, this.words, start);
    this.words.fill(HOLE_WORD, start + n, start + room);
    this.bound(segments, start);
    this.places.set(box, { start, count: n });
    this.live += n;
    this.used += room;
    this.upload(start, room);
    return uploaded;
  }

  /** `box`'s segments no longer drawn, a hole in their place. What was uploaded, in segments: their words alone. */
  remove(box: number): number {
    const place = this.places.get(box);
    if (!place) return 0;
    this.places.delete(box);
    this.live -= place.count;
    if (place.count === 0) return 0;
    const room = roomFor(place.count);
    this.used -= room;
    this.words.fill(HOLE_WORD, place.start, place.start + place.count);
    this.blocks.fill(0, rowOf(place.start), rowOf(place.start + room));
    this.leave({ start: place.start, count: room });
    // The last box's words are past the end once it goes, where nothing is drawn.
    const count = place.start < this.end ? place.count : 0;
    this.upload(place.start, count, true);
    return Math.ceil((4 * count) / SEGMENT_BYTES);
  }

  /**
   * What it uploads to let go of, and its arrays, which a read still under way would keep past a new arena's otherwise
   * (on WebGPU; on WebGL 2 its quads' attributes hold them too); its quads are the caller's.
   */
  dispose(): void {
    this.uploads.dispose();
    this.uploads = NO_UPLOADS;
    this.ends = new Float32Array(0);
    this.words = new Uint32Array(0);
    this.blocks = new Float32Array(0);
    this.blockWords = new Uint32Array(0);
  }

  /**
   * The boxes of the blocks from the one `start` starts on, over `segments`: each end's reach (`QUAD_REACH`) in each
   * axis. A block's first segment is kept with its box's least corner, and its segments with its greatest.
   */
  private bound(segments: Float32Array, start: number): void {
    const { blocks, blockWords } = this;
    const n = segments.length / 8;
    for (let s = 0, o = rowOf(start); s < n; s += BLOCK, o += 8) {
      const last = Math.min(n, s + BLOCK);
      let x0 = Infinity;
      let y0 = Infinity;
      let z0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      let z1 = -Infinity;
      for (let k = 8 * s; k < 8 * last; k += 4) {
        const reach = QUAD_REACH * segments[k + 3];
        x0 = Math.min(x0, segments[k] - reach);
        y0 = Math.min(y0, segments[k + 1] - reach);
        z0 = Math.min(z0, segments[k + 2] - reach);
        x1 = Math.max(x1, segments[k] + reach);
        y1 = Math.max(y1, segments[k + 1] + reach);
        z1 = Math.max(z1, segments[k + 2] + reach);
      }
      blocks[o] = x0;
      blocks[o + 1] = y0;
      blocks[o + 2] = z0;
      blockWords[o + 3] = start + s;
      blocks[o + 4] = x1;
      blocks[o + 5] = y1;
      blocks[o + 6] = z1;
      blockWords[o + 7] = last - s;
    }
  }

  /** Where `room` goes with no box moved: the smallest hole it fits in, else the end; null where neither. */
  private take(room: number): number | null {
    let best = -1;
    for (let i = 0; i < this.holes.length; i++) {
      const { count } = this.holes[i];
      if (count >= room && (best < 0 || count < this.holes[best].count)) best = i;
    }
    if (best >= 0 && room > 0) {
      const hole = this.holes[best];
      const start = hole.start;
      hole.start += room;
      hole.count -= room;
      if (hole.count === 0) this.holes.splice(best, 1);
      return start;
    }
    if (this.end + room > this.capacity) return null;
    this.end += room;
    return this.end - room;
  }

  /** `place` a hole, joined to the holes it touches, or the end brought back to it where it was the last. */
  private leave({ start, count }: Place): void {
    let at = this.holes.findIndex((hole) => hole.start > start);
    if (at < 0) at = this.holes.length;
    const hole = { start, count };
    const before = this.holes[at - 1];
    if (before && before.start + before.count === hole.start) {
      hole.start = before.start;
      hole.count += before.count;
      this.holes.splice(--at, 1);
    }
    const after = this.holes[at];
    if (after && hole.start + hole.count === after.start) {
      hole.count += after.count;
      this.holes.splice(at, 1);
    }
    if (hole.start + hole.count === this.end) this.end = hole.start;
    else this.holes.splice(at, 0, hole);
  }

  /**
   * Every box moved down in the order they lie, with its blocks, the holes closed. The segments uploaded: those from
   * the first hole on.
   */
  private compact(): number {
    const { ends, words, blocks } = this;
    const from = this.holes[0]?.start ?? this.end;
    let at = 0;
    for (const place of [...this.places.values()].sort((a, b) => a.start - b.start)) {
      const room = roomFor(place.count);
      if (place.start !== at) {
        ends.copyWithin(8 * at, 8 * place.start, 8 * (place.start + room));
        words.copyWithin(at, place.start, place.start + room);
        blocks.copyWithin(rowOf(at), rowOf(place.start), rowOf(place.start + room));
        place.start = at;
      }
      at += room;
    }
    // Every box from the first hole on moved, and each block's first segment is where the block now is.
    for (let slot = from; slot < at; slot += BLOCK) this.blockWords[rowOf(slot) + 3] = slot;
    blocks.fill(0, rowOf(at), rowOf(this.end));
    this.holes = [];
    this.end = at;
    this.upload(from, at - from);
    return at - from;
  }

  private upload(start: number, count: number, wordsOnly = false): void {
    this.geometry.instanceCount = this.end;
    if (count > 0) this.uploads.upload(start, count, wordsOnly);
  }
}
