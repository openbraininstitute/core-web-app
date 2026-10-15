import * as THREE from 'three';

import { HOLE } from './impostors';

import type { MorphologySegments } from '../types';

/** The bytes a segment takes on the GPU: its two ends, its cell and its type. */
export const SEGMENT_BYTES = 8 * 4 + 4 + 1;

interface Place {
  start: number;
  count: number;
}

/**
 * The segments of the boxes drawn, as the segments' quads take them, in one geometry of a fixed number of segments
 * drawn up to the last box. A box's segments lie together. A box let go of leaves a hole, its segments marked `HOLE`,
 * which the shaders draw nothing of; the smallest hole a box fits in takes it, or else the end, and where neither has
 * room every box is moved down to close the holes. Only what changed is uploaded.
 */
export class SegmentArena {
  readonly geometry: THREE.InstancedBufferGeometry;
  readonly capacity: number;
  private ends: THREE.InstancedInterleavedBuffer;
  private cells: THREE.InstancedBufferAttribute;
  private types: THREE.InstancedBufferAttribute;
  private places = new Map<number, Place>();
  /** By where they start, none touching another or the end. */
  private holes: Place[] = [];
  /** Where the last box ends: what is drawn. */
  private end = 0;
  private live = 0;

  /** `geometry` is the segments' quad, which takes the arena's attributes. */
  constructor(geometry: THREE.InstancedBufferGeometry, capacity: number) {
    this.geometry = geometry;
    this.capacity = capacity;
    this.ends = new THREE.InstancedInterleavedBuffer(new Float32Array(8 * capacity), 8);
    this.cells = new THREE.InstancedBufferAttribute(new Uint32Array(capacity), 1);
    this.types = new THREE.InstancedBufferAttribute(new Uint8Array(capacity), 1);
    // No dendrogram: the ends stand for it, and the morph moves nothing.
    geometry
      .setAttribute('aA', new THREE.InterleavedBufferAttribute(this.ends, 4, 0))
      .setAttribute('aB', new THREE.InterleavedBufferAttribute(this.ends, 4, 4))
      .setAttribute('aChartA', new THREE.InterleavedBufferAttribute(this.ends, 4, 0))
      .setAttribute('aChartB', new THREE.InterleavedBufferAttribute(this.ends, 4, 4))
      .setAttribute('aCell', this.cells)
      .setAttribute('aType', this.types);
    geometry.instanceCount = 0;
  }

  /** The segments of the boxes drawn, holes left out. */
  get segments(): number {
    return this.live;
  }

  get free(): number {
    return this.capacity - this.live;
  }

  /** The segments of `box` drawn; undefined where it is not. */
  sizeOf(box: number): number | undefined {
    return this.places.get(box)?.count;
  }

  /**
   * `box`'s segments drawn; it must not be drawn already, and they must fit. What was uploaded, in segments: theirs,
   * and every box's where the holes had to be closed.
   */
  put(box: number, { segments, segmentCells, segmentTypes }: MorphologySegments): number {
    const n = segmentCells.length;
    if (this.places.has(box)) throw new Error(`box ${box} is drawn already`);
    if (n > this.free) throw new RangeError(`${n} segments, where ${this.free} are free`);
    let start = this.take(n);
    let uploaded = n;
    if (start === null) {
      uploaded += this.compact();
      start = this.end;
      this.end += n;
    }
    (this.ends.array as Float32Array).set(segments, 8 * start);
    this.cells.array.set(segmentCells, start);
    this.types.array.set(segmentTypes, start);
    this.places.set(box, { start, count: n });
    this.live += n;
    this.upload(start, n);
    return uploaded;
  }

  /** `box`'s segments no longer drawn, a hole in their place. What was uploaded, in segments: their types alone. */
  remove(box: number): number {
    const place = this.places.get(box);
    if (!place) return 0;
    this.places.delete(box);
    this.live -= place.count;
    if (place.count === 0) return 0;
    this.types.array.fill(HOLE, place.start, place.start + place.count);
    this.types.addUpdateRange(place.start, place.count);
    this.types.needsUpdate = true;
    this.leave(place);
    this.geometry.instanceCount = this.end;
    return Math.ceil(place.count / SEGMENT_BYTES);
  }

  dispose(): void {
    this.geometry.dispose();
  }

  /** Where `count` segments go with no box moved: the smallest hole they fit in, else the end; null where neither. */
  private take(count: number): number | null {
    let best = -1;
    for (let i = 0; i < this.holes.length; i++) {
      const { count: room } = this.holes[i];
      if (room >= count && (best < 0 || room < this.holes[best].count)) best = i;
    }
    if (best >= 0 && count > 0) {
      const hole = this.holes[best];
      const start = hole.start;
      hole.start += count;
      hole.count -= count;
      if (hole.count === 0) this.holes.splice(best, 1);
      return start;
    }
    if (this.end + count > this.capacity) return null;
    this.end += count;
    return this.end - count;
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

  /** Every box moved down in the order they lie, the holes closed. The segments uploaded: all of them. */
  private compact(): number {
    const ends = this.ends.array as Float32Array;
    let at = 0;
    for (const place of [...this.places.values()].sort((a, b) => a.start - b.start)) {
      if (place.start !== at) {
        ends.copyWithin(8 * at, 8 * place.start, 8 * (place.start + place.count));
        this.cells.array.copyWithin(at, place.start, place.start + place.count);
        this.types.array.copyWithin(at, place.start, place.start + place.count);
        place.start = at;
      }
      at += place.count;
    }
    this.holes = [];
    this.end = at;
    this.upload(0, at);
    return at;
  }

  private upload(start: number, count: number): void {
    this.geometry.instanceCount = this.end;
    if (count === 0) return;
    this.ends.addUpdateRange(8 * start, 8 * count);
    this.ends.needsUpdate = true;
    for (const attribute of [this.cells, this.types]) {
      attribute.addUpdateRange(start, count);
      attribute.needsUpdate = true;
    }
  }
}
