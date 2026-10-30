import * as THREE from 'three';

import { HOLE_WORD, packCellTypes, QUAD_REACH, segmentAttributes } from './impostors';

import type { MorphologySegments } from '../types';

/** The bytes a segment takes on the GPU: its two ends, and its cell and type in a word. */
export const SEGMENT_BYTES = 8 * 4 + 4;
/** How many segments the culling tests together as a block. It tests the block's box first. */
export const BLOCK = 64;

/** The room `segments` take in an arena: a whole number of blocks. */
export const roomFor = (segments: number) => Math.ceil(segments / BLOCK) * BLOCK;
/** Where the block starting at `slot` is in the blocks' array. */
const rowOf = (slot: number) => (8 * slot) / BLOCK;
/** The upload size of `count` segments' words alone, in segments. */
const wordsOf = (count: number) => Math.ceil((4 * count) / SEGMENT_BYTES);

/** The box whose room holds `slot`. `starts` holds where each box's room starts, and where the last one ends. */
function boxAt(starts: Uint32Array, slot: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (starts[mid + 1] <= slot) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Uploads an arena's arrays. It is told which segments changed, and always uploads the blocks over them too;
 * `wordsOnly` leaves out the segments' ends, never the blocks.
 */
export interface ArenaUploads {
  upload(start: number, count: number, wordsOnly: boolean): void;
  dispose(): void;
}

/**
 * Makes an arena's uploads for its segments' ends (8 floats each), their cell-and-type words, and its blocks (8 words
 * each: the least x, y and z of the block's box, its first segment, the greatest x, y and z, and its segment count).
 */
export type UploadsOf = (
  ends: Float32Array,
  words: Uint32Array,
  blocks: Float32Array
) => ArenaUploads;

const NO_UPLOADS: ArenaUploads = { upload() {}, dispose() {} };

/** The arrays as three's attributes on the quads' `geometry`; three uploads the ranges that changed. */
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
 * Holds the segments of the boxes drawn, laid out as the segments' quads read them, in arrays of a fixed number of
 * segments. The quads are drawn up to the last box. A box's segments lie together, starting at a block of `BLOCK`, with
 * holes filling out its last block. A box let go of leaves a hole: its segments' type becomes `HOLE`, which the shaders
 * draw nothing of. A box goes into the smallest hole it fits, or else at the end; where neither has room, every box is
 * moved down to close the holes. Each block holds the box its segments are drawn in, empty where it has no segment.
 * Only what changed before the end is uploaded (`ArenaUploads`), so whatever reads the blocks reads none past the end.
 *
 * With a base, the arena starts with room for each box at its base level, in the boxes' order. No other box takes that
 * room, and it never moves. A box's base is drawn there (`putBase`) while the box is not put at another level; while
 * it is, the base's room is holes with its blocks emptied. So every draw of the arena draws each box once.
 */
export class SegmentArena {
  readonly geometry: THREE.InstancedBufferGeometry;
  readonly capacity: number;
  /** The room kept for the base, none without one. */
  readonly baseRoom: number;
  private ends: Float32Array;
  private words: Uint32Array;
  private blocks: Float32Array;
  private blockWords: Uint32Array;
  private uploads: ArenaUploads;
  private uploadsOf?: UploadsOf;
  private places = new Map<number, Place>();
  /** Sorted by where they start. No hole touches another or the end. */
  private holes: Place[] = [];
  /** Where the last box's room ends: the quads are drawn up to here. */
  private end = 0;
  private live = 0;
  private used = 0;
  /** Where each box's base starts, and where the last ends; null without a base. */
  private baseAt: Uint32Array | null = null;
  /** Each box's base segments, -1 until it is put. */
  private baseCounts = new Int32Array(0);
  /** The base's words. The arena's words match them wherever no box hides the base. */
  private baseWords = new Uint32Array(0);

  /**
   * `geometry` is the segments' quad, drawn once for each slot up to the end of the last box; `capacity` is rounded
   * up to a whole number of blocks; without `uploadsOf`, the arrays are three's attributes on `geometry`; `base` gives
   * each box's segments at its base level, which the arena keeps room for.
   */
  constructor(
    geometry: THREE.InstancedBufferGeometry,
    capacity: number,
    uploadsOf?: UploadsOf,
    base?: ArrayLike<number>
  ) {
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
    this.baseRoom = 0;
    if (!base) return;
    const baseAt = new Uint32Array(base.length + 1);
    for (let box = 0; box < base.length; box++) baseAt[box + 1] = baseAt[box] + roomFor(base[box]);
    this.baseRoom = baseAt[base.length];
    if (this.baseRoom > this.capacity) {
      throw new RangeError(`a base of ${this.baseRoom}, where ${this.capacity} are held`);
    }
    this.baseAt = baseAt;
    this.baseCounts = Int32Array.from(base, (n) => (n === 0 ? 0 : -1));
    this.baseWords = new Uint32Array(this.baseRoom);
    this.words.fill(HOLE_WORD, 0, this.baseRoom);
    this.end = this.baseRoom;
    this.used = this.baseRoom;
    this.upload(0, this.baseRoom, true);
  }

  /** An empty arena of `capacity` on `geometry`, uploaded as this one is, with room for `base`. */
  remade(
    geometry: THREE.InstancedBufferGeometry,
    capacity: number,
    base?: ArrayLike<number>
  ): SegmentArena {
    return new SegmentArena(geometry, capacity, this.uploadsOf, base);
  }

  /** Whether it keeps room for a base. */
  get keepsBase(): boolean {
    return this.baseAt !== null;
  }

  /** The segments of the boxes drawn, holes left out. */
  get segments(): number {
    return this.live;
  }

  /** The room no box takes. */
  get free(): number {
    return this.capacity - this.used;
  }

  /** How many segments `box` has put; undefined where it is not put (its base does not count). */
  sizeOf(box: number): number | undefined {
    return this.places.get(box)?.count;
  }

  /** Whether `box`'s base is put, or has no segments. */
  hasBase(box: number): boolean {
    return this.baseCounts[box] >= 0;
  }

  /**
   * The boxes drawn with a block marked in `marked` (a bit a block), each listed once. Marks read back a frame or two
   * late are taken as they are: a box put since its base was marked is included, and a box moved since may be missed.
   */
  boxesMarked(marked: Uint32Array): number[] {
    const boxes: number[] = [];
    for (const [box, { start, count }] of this.places) {
      const last = (start + roomFor(count)) / BLOCK;
      for (let block = start / BLOCK; block < last; block++) {
        if ((marked[block >>> 5] & (1 << (block & 31))) !== 0) {
          boxes.push(box);
          break;
        }
      }
    }
    const { baseAt } = this;
    if (!baseAt) return boxes;
    // Each marked block of the base stands for the box whose base it holds; the boxes come in order.
    const blocks = this.baseRoom / BLOCK;
    let found: Set<number> | null = null;
    // Where the base of the last box found ends: its other blocks are skipped.
    let past = 0;
    for (let word = 0; 32 * word < blocks; word++) {
      for (let bits = marked[word]; bits !== 0; bits &= bits - 1) {
        const block = 32 * word + 31 - Math.clz32(bits & -bits);
        if (block >= blocks) break;
        if (BLOCK * block < past) continue;
        const box = boxAt(baseAt, BLOCK * block);
        past = baseAt[box + 1];
        if (this.places.has(box)) {
          found ??= new Set(boxes);
          if (found.has(box)) continue;
        }
        boxes.push(box);
      }
    }
    return boxes;
  }

  /**
   * Puts `box`'s base in the room kept for it, and draws it unless the box is put. The base must not be put already,
   * and must fit. Returns what was uploaded, in segments.
   */
  putBase(box: number, { segments, segmentCells, segmentTypes }: MorphologySegments): number {
    const { baseAt } = this;
    const n = segmentCells.length;
    if (!baseAt) throw new Error('no room is kept for a base');
    if (this.hasBase(box)) throw new Error(`box ${box}'s base is drawn already`);
    const start = baseAt[box];
    if (roomFor(n) > baseAt[box + 1] - start) {
      throw new RangeError(`a base of ${n}, where ${baseAt[box + 1] - start} are kept`);
    }
    this.ends.set(segments, 8 * start);
    packCellTypes(segmentCells, segmentTypes, this.baseWords, start);
    this.baseCounts[box] = n;
    if (!this.places.has(box)) this.drawBase(box);
    this.upload(start, n);
    return n;
  }

  /** Where `box`'s base starts, if a base with segments is put; else -1. */
  private baseStart(box: number): number {
    return this.baseAt && this.baseCounts[box] > 0 ? this.baseAt[box] : -1;
  }

  /** Draws `box`'s base, if it has one: sets its words, and its blocks over its ends. Returns its segments. */
  private drawBase(box: number): number {
    const start = this.baseStart(box);
    if (start < 0) return 0;
    const n = this.baseCounts[box];
    this.words.set(this.baseWords.subarray(start, start + n), start);
    this.bound(this.ends.subarray(8 * start, 8 * (start + n)), start);
    this.live += n;
    return n;
  }

  /** Draws `box`'s base again and uploads its words and blocks; returns what was uploaded, in segments. */
  private showBase(box: number): number {
    const n = this.drawBase(box);
    if (n > 0) this.upload(this.baseStart(box), n, true);
    return wordsOf(n);
  }

  /** Hides `box`'s base, if it has one, and uploads its words and blocks; returns what was uploaded, in segments. */
  private hideBase(box: number): number {
    const start = this.baseStart(box);
    if (start < 0) return 0;
    const n = this.baseCounts[box];
    this.hole(start, n);
    this.live -= n;
    this.upload(start, n, true);
    return wordsOf(n);
  }

  /** How much more room `box` takes with `segments` drawn in place of what it has. */
  growthOf(box: number, segments: number): number {
    return roomFor(segments) - roomFor(this.sizeOf(box) ?? 0);
  }

  /**
   * Draws `segments` for `box` in place of what it has; its base stays hidden while the box is put. They must fit.
   * Returns what was uploaded, in segments: their room, every box's where the holes had to be closed, and the words of
   * what it had or of its base.
   */
  replace(box: number, segments: MorphologySegments): number {
    const was = this.places.has(box) ? this.unplace(box) : this.hideBase(box);
    return was + this.place(box, segments);
  }

  /**
   * Stops drawing `box`'s segments, leaving a hole in their place, and draws its base again. Returns what was uploaded,
   * in segments: their words alone, and its base's.
   */
  remove(box: number): number {
    if (!this.places.has(box)) return 0;
    return this.unplace(box) + this.showBase(box);
  }

  /** Draws `box`'s segments, which must fit; returns what was uploaded, in segments. */
  private place(box: number, { segments, segmentCells, segmentTypes }: MorphologySegments): number {
    const n = segmentCells.length;
    const room = roomFor(n);
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

  /** Lets go of `box`'s segments, leaving a hole in their place. Returns the segments uploaded: their words alone. */
  private unplace(box: number): number {
    const place = this.places.get(box);
    if (!place) return 0;
    this.places.delete(box);
    this.live -= place.count;
    if (place.count === 0) return 0;
    const room = roomFor(place.count);
    this.used -= room;
    this.hole(place.start, place.count);
    this.leave({ start: place.start, count: room });
    // Once the last box goes, its words are past the end, where nothing is drawn.
    const count = place.start < this.end ? place.count : 0;
    this.upload(place.start, count, true);
    return wordsOf(count);
  }

  /** Turns the `count` segments from `start` into holes, and empties their blocks. */
  private hole(start: number, count: number): void {
    this.words.fill(HOLE_WORD, start, start + count);
    this.blocks.fill(0, rowOf(start), rowOf(start + roomFor(count)));
  }

  /**
   * Lets go of what it uploads to, and of its arrays: otherwise a read still under way would keep them alive alongside
   * a new arena's (on WebGPU; on WebGL 2 its quads' attributes hold them too). Its quads belong to the caller.
   */
  dispose(): void {
    this.uploads.dispose();
    this.uploads = NO_UPLOADS;
    this.ends = new Float32Array(0);
    this.words = new Uint32Array(0);
    this.blocks = new Float32Array(0);
    this.blockWords = new Uint32Array(0);
    this.baseWords = new Uint32Array(0);
  }

  /**
   * Sets the boxes of the blocks over `segments`, from the block at `start`: each box covers each end's reach
   * (`QUAD_REACH`) in each axis. A block keeps its first segment next to its box's least corner, and its segment count
   * next to the greatest.
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

  /** Where `room` goes without moving any box: the smallest hole it fits, else the end; null where neither has room. */
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

  /** Turns `place` into a hole, joined to the holes it touches; where it was the last, the end moves back to it. */
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
   * Moves every box down to the base, in the order they lie, with its blocks, closing the holes. Returns the segments
   * uploaded: those from the first hole on.
   */
  private compact(): number {
    const { ends, words, blocks } = this;
    const from = this.holes[0]?.start ?? this.end;
    let at = this.baseRoom;
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
    // Every box from the first hole on has moved, so each block's first segment is now where the block is.
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
