import * as THREE from 'three';

import type { MorphologySegments } from '../types';

/** The bytes a segment takes on the GPU: its two ends, its cell and its type. */
export const SEGMENT_BYTES = 8 * 4 + 4 + 1;

/**
 * The segments of the boxes drawn, as the segments' quads take them, in one geometry of a fixed number of segments
 * that is drawn whole: a box's segments go after the last, and where a box's are let go of, the last segments drawn
 * take their place. A box's segments may so come to lie in several runs. Only what changed is uploaded.
 */
export class SegmentArena {
  readonly geometry: THREE.InstancedBufferGeometry;
  readonly capacity: number;
  private ends: THREE.InstancedInterleavedBuffer;
  private cells: THREE.InstancedBufferAttribute;
  private types: THREE.InstancedBufferAttribute;
  /** Each segment's box. */
  private owners: Int32Array;
  /** Each box's runs, where each starts and how long it is, one after another. */
  private runs = new Map<number, number[]>();
  private sizes = new Map<number, number>();
  private used = 0;

  /** `geometry` is the segments' quad, which takes the arena's attributes. */
  constructor(geometry: THREE.InstancedBufferGeometry, capacity: number) {
    this.geometry = geometry;
    this.capacity = capacity;
    this.ends = new THREE.InstancedInterleavedBuffer(new Float32Array(8 * capacity), 8);
    this.cells = new THREE.InstancedBufferAttribute(new Uint32Array(capacity), 1);
    this.types = new THREE.InstancedBufferAttribute(new Uint8Array(capacity), 1);
    this.owners = new Int32Array(capacity);
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

  /** The segments drawn. */
  get segments(): number {
    return this.used;
  }

  get free(): number {
    return this.capacity - this.used;
  }

  /** The segments of `box` drawn; undefined where it is not. */
  sizeOf(box: number): number | undefined {
    return this.sizes.get(box);
  }

  /** `box`'s segments drawn, after the last; it must not be drawn already, and they must fit. The segments uploaded. */
  put(box: number, { segments, segmentCells, segmentTypes }: MorphologySegments): number {
    const n = segmentCells.length;
    if (this.sizes.has(box)) throw new Error(`box ${box} is drawn already`);
    if (n > this.free) throw new RangeError(`${n} segments, where ${this.free} are free`);
    const start = this.used;
    (this.ends.array as Float32Array).set(segments, 8 * start);
    this.cells.array.set(segmentCells, start);
    this.types.array.set(segmentTypes, start);
    this.owners.fill(box, start, start + n);
    this.runs.set(box, n > 0 ? [start, n] : []);
    this.sizes.set(box, n);
    this.used += n;
    this.upload(start, n);
    return n;
  }

  /** `box`'s segments no longer drawn, the last segments in their place. The segments uploaded. */
  remove(box: number): number {
    const runs = this.runs.get(box);
    if (!runs) return 0;
    this.runs.delete(box);
    this.sizes.delete(box);
    const starts: number[] = [];
    for (let i = 0; i < runs.length; i += 2) starts.push(i);
    // From the last run back: the segments after a run are then all of other boxes.
    starts.sort((a, b) => runs[b] - runs[a]);
    let moved = 0;
    for (const i of starts) moved += this.fill(runs[i], runs[i + 1]);
    this.geometry.instanceCount = this.used;
    return moved;
  }

  dispose(): void {
    this.geometry.dispose();
  }

  /** The `count` segments from `start` on, of a box let go of, given to the last ones. The segments moved. */
  private fill(start: number, count: number): number {
    const moved = Math.min(count, this.used - start - count);
    if (moved > 0) this.move(this.used - moved, start, moved);
    this.used -= count;
    return moved;
  }

  /** The last `count` segments drawn, from `from` on, moved to `to`, before them; their boxes' runs moved with them. */
  private move(from: number, to: number, count: number): void {
    for (let i = from; i < from + count; ) {
      const runs = this.runs.get(this.owners[i]);
      if (!runs) throw new Error(`segment ${i} of a box not drawn`);
      let r = 0;
      while (!(runs[r] <= i && i < runs[r] + runs[r + 1])) r += 2;
      const [start, length] = [runs[r], runs[r + 1]];
      // A run goes on to the last segment, as the segments moved do: only the first can begin before them.
      if (start < from) {
        runs[r + 1] = from - start;
        runs.push(to, start + length - from);
      } else {
        runs[r] = start - from + to;
      }
      i = start + length;
    }
    (this.ends.array as Float32Array).copyWithin(8 * to, 8 * from, 8 * (from + count));
    this.cells.array.copyWithin(to, from, from + count);
    this.types.array.copyWithin(to, from, from + count);
    this.owners.copyWithin(to, from, from + count);
    this.upload(to, count);
  }

  private upload(start: number, count: number): void {
    this.geometry.instanceCount = this.used;
    if (count === 0) return;
    this.ends.addUpdateRange(8 * start, 8 * count);
    this.ends.needsUpdate = true;
    for (const attribute of [this.cells, this.types]) {
      attribute.addUpdateRange(start, count);
      attribute.needsUpdate = true;
    }
  }
}
