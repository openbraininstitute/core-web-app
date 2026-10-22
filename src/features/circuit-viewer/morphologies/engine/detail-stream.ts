import { logError } from '@/utils/logger';

import { chooseDetail, type Detail, type DetailView } from './detail';
import { roomFor, SEGMENT_BYTES, SegmentArena, type UploadsOf } from './segment-arena';

import type * as THREE from 'three';
import type {
  BoxRead,
  DetailRules,
  DetailStats,
  MorphologyChunks,
  MorphologySegments,
  PackArrival,
} from '../types';

/** The most segments asked of the pack's worker at once: a batch is read in some milliseconds. */
const BATCH_SEGMENTS = 250_000;
/** The segments placed in a turn of the loop, 4 MB of upload, unless one box alone is more. */
const PLACED_SEGMENTS = Math.floor((4 * 2 ** 20) / SEGMENT_BYTES);
/**
 * The culling's reads a box is taken as seen for after the last that marked it, which come a frame or two late: while
 * the view moves, long enough that a box at the edge of sight is not let go of as it comes and goes; at rest, of the
 * frames drawn since it came to rest, no more than that.
 */
export const LINGER = { moving: 30, still: 4 } as const;

/** The culling's reads, and of each box the one that last marked it (0 for none). */
interface Marks {
  reads: number;
  at: Int32Array;
}

/**
 * What the culling's reads tell is seen: the marks of every read, and of the reads of frames drawn still, with how many
 * of those there were when the view last came to rest, and how many times it did; and each box taken as seen, or with
 * `all` every box in view, the marks read no more.
 */
interface Sight {
  every: Marks;
  still: Marks;
  restFrom: number;
  rest: number;
  seen: Uint8Array;
  all: boolean;
}

const marksOf = (count: number): Marks => ({ reads: 0, at: new Int32Array(count) });

const sightOf = (count: number): Sight => ({
  every: marksOf(count),
  still: marksOf(count),
  restFrom: 0,
  rest: 0,
  seen: new Uint8Array(count),
  all: false,
});

/** `boxes` marked by a read more. */
function mark(marks: Marks, boxes: readonly number[]): void {
  const read = ++marks.reads;
  for (const box of boxes) marks.at[box] = read;
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/**
 * The segments an arena of a pack's boxes holds: the most room they can take drawn at once, each at its largest level,
 * within `budget`, and a quarter more, so that its holes seldom have to be closed; with `base`, the segments of each
 * box at the coarsest level, at the levels finer than it, beside room for the base.
 */
function capacityOf(
  { levels, boxes }: MorphologyChunks,
  budget: number,
  base?: Uint32Array
): number {
  const finer = base ? levels.slice(0, -1) : levels;
  let most = 0;
  let baseRoom = 0;
  for (let box = 0; box < boxes.length / 6; box++) {
    most += roomFor(Math.max(0, ...finer.map((level) => level.segments[box])));
    if (base) baseRoom += roomFor(base[box]);
  }
  return baseRoom + Math.ceil(1.25 * Math.min(most, budget));
}

/** An arena of `chunks` for `budget`, keeping every box's coarsest level where it then holds no more than `baseUpTo`. */
function arenaPlan(
  chunks: MorphologyChunks,
  budget: number,
  baseUpTo: number
): { capacity: number; base?: Uint32Array } {
  if (baseUpTo > 0) {
    const base = chunks.levels[chunks.levels.length - 1].segments;
    const capacity = capacityOf(chunks, budget, base);
    if (roomFor(capacity) <= baseUpTo) return { capacity, base };
  }
  return { capacity: capacityOf(chunks, budget) };
}

/**
 * A pack's boxes in an arena at the levels the view wants (`chooseDetail`): those it no longer wants let go of at once,
 * the others read from the pack a batch at a time, the nearest the focus first, and swapped in a box at a time as they
 * come. A box goes finer only while the view is still; coarser, at once. Placing them is paced (`apply`), so that a
 * frame uploads little. Where the arena keeps a base, every box's coarsest level is read, those in view first and then
 * the finer levels they want, before the others, and kept: a box goes back to it with no read, and the budget counts
 * the finer levels alone. There, with the culling's marks (`see`), a box goes finer only while seen, and one no longer
 * seen goes back to its base as the view moves (it keeps what it has at rest); one let go of while the view rests is
 * not asked for again until it moves or the rules change; and while the view moves, a box wanted coarser goes back to
 * its base at once, unless wanted at the floor (`Detail.floor`), no coarser than which it stays. Of a pack still coming in, a box is asked for at a level only once its bytes are in, and wanted no
 * finer than what is in, as if the pixels wanted no more.
 */
export class DetailStream {
  private chunks: MorphologyChunks;
  private arena: SegmentArena;
  private onRead: () => void;
  private coarsest: number;
  /** The levels drawn of each box, -1 for none. */
  private drawn: Int8Array;
  /** What the view wants, as last chosen, and the rules it was chosen by. */
  private detail: Detail | null = null;
  private rules: DetailRules | null = null;
  private still = false;
  private sight: Sight;
  /** The boxes let go of while the view rested where it is. */
  private letGo = new Set<number>();
  /**
   * The finest level `box` may be drawn at: any where it is seen, or has nothing at its base, which nothing marks; one
   * not seen, while the view rests no finer than it is drawn and no coarser, so that no frame at rest takes away what
   * it hides, and while it moves its base; one let go of, its base.
   */
  private finestFor = (box: number): number => {
    const { coarsest } = this;
    if (this.letGo.has(box)) return coarsest;
    if (this.sight.seen[box] === 1 || this.segmentsAt(box, coarsest) === 0) return 0;
    const drawn = this.drawn[box];
    return this.still && drawn >= 0 ? drawn : coarsest;
  };
  /** What came in and is not placed yet, by box, and of the bases. */
  private ready = new Map<number, { level: number; segments: MorphologySegments }>();
  private bases = new Map<number, MorphologySegments>();
  /** Whether no base is to be read again: each is placed, in, or could not be read. */
  private basesRead: boolean;
  private reading = false;
  private stopped = false;
  /** The boxes of a batch that could not be read, which are read no more, and whether that was told. */
  private unread = new Set<number>();
  private told = false;
  /**
   * Of a pack still coming in, how much is in and the finest level of each box that is (the levels' count where none
   * is), whether that lifted what a box was chosen at since the levels were last chosen, and what stops it being told.
   */
  private coming: { arrival: PackArrival; arrived: Int8Array } | null = null;
  private arrivedMore = false;
  private unlisten: (() => void) | null = null;

  /**
   * `onRead` is told when boxes came in, to be placed, or more of the pack did, to be read; the arena keeps a base, of
   * the coarsest level, where it keeps room for one (`SegmentArena`).
   */
  constructor(chunks: MorphologyChunks, arena: SegmentArena, onRead: () => void) {
    this.chunks = chunks;
    this.arena = arena;
    this.onRead = onRead;
    this.coarsest = chunks.levels.length - 1;
    const count = chunks.boxes.length / 6;
    this.drawn = new Int8Array(count).fill(-1);
    this.sight = sightOf(count);
    this.basesRead = !arena.keepsBase;
    if (arena.keepsBase) {
      // Those of no segments at the base's level are drawn at it.
      for (let box = 0; box < this.drawn.length; box++) {
        if (arena.hasBase(box)) this.drawn[box] = this.coarsest;
      }
    }
    const { arrival } = chunks;
    if (arrival) {
      this.coming = { arrival, arrived: new Int8Array(count).fill(chunks.levels.length) };
      this.arrive();
      // Only a box drawn coarser for what was in has the levels chosen again; what is newly in otherwise is just read.
      this.unlisten = arrival.listen(() => {
        if (!this.arrive()) {
          this.read();
          return;
        }
        this.arrivedMore = true;
        this.onRead();
      });
    }
  }

  /** Whether the levels are to be chosen again, more of the pack having come in since they were last. */
  get moreArrived(): boolean {
    return this.arrivedMore;
  }

  /**
   * The finest level of each box that is in brought up to what is in now; whether that lifted what a box in view was
   * chosen at for what was in.
   */
  private arrive(): boolean {
    if (!this.coming) return false;
    const { arrival, arrived } = this.coming;
    const received = arrival.received();
    const { readableAt } = arrival;
    const capped = this.detail?.capped;
    const chosen = this.detail?.levels;
    let lifted = false;
    for (let box = 0; box < arrived.length; box++) {
      let level = arrived[box];
      while (level > 0 && readableAt[level - 1][box] <= received) level--;
      if (level === arrived[box]) continue;
      arrived[box] = level;
      if (capped?.[box] === 1 && chosen && chosen[box] > level) lifted = true;
    }
    return lifted;
  }

  /** Whether `box` is in at `level`. */
  private isIn(box: number, level: number): boolean {
    return !this.coming || this.coming.arrived[box] <= level;
  }

  /**
   * A stream into an arena on `geometry`, the segments' quad, as large as the pack's boxes can need within `budget`,
   * uploaded as `uploadsOf` has it; keeping a base where that takes no more than `baseUpTo` segments.
   */
  static of(
    chunks: MorphologyChunks,
    budget: number,
    geometry: THREE.InstancedBufferGeometry,
    onRead: () => void,
    uploadsOf?: UploadsOf,
    baseUpTo = 0
  ): DetailStream {
    const { capacity, base } = arenaPlan(chunks, budget, baseUpTo);
    const arena = new SegmentArena(geometry, capacity, uploadsOf, base);
    return new DetailStream(chunks, arena, onRead);
  }

  /**
   * Whether its arena holds as much as `budget` asks of it, and keeps a base where one made for it would, holding no
   * more than `baseUpTo`.
   */
  holds(budget: number, baseUpTo: number): boolean {
    const { capacity, base } = arenaPlan(this.chunks, budget, baseUpTo);
    return (base !== undefined) === this.arena.keepsBase && capacity <= this.arena.capacity;
  }

  /**
   * Its boxes streamed again into an arena on `geometry` made for `budget`, uploaded as its own is, keeping a base where
   * it then holds no more than `baseUpTo`, those it could not read left out and those seen taken as seen; this stream
   * stopped first, so that what its arena uploads to is let go of before the new one's is made.
   */
  remade(budget: number, baseUpTo: number, geometry: THREE.InstancedBufferGeometry): DetailStream {
    this.stop();
    const { capacity, base } = arenaPlan(this.chunks, budget, baseUpTo);
    const arena = this.arena.remade(geometry, capacity, base);
    const stream = new DetailStream(this.chunks, arena, this.onRead);
    stream.unread = this.unread;
    stream.told = this.told;
    stream.sight = this.sight;
    stream.still = this.still;
    return stream;
  }

  /** The arena's quads, which draw what is placed. */
  get geometry(): THREE.InstancedBufferGeometry {
    return this.arena.geometry;
  }

  /** The boxes placed with a block of the arena marked in `marked`, a bit a block. */
  boxesMarked(marked: Uint32Array): number[] {
    return this.arena.boxesMarked(marked);
  }

  /** Which rest the view is in: one more each time it comes to rest, here or by a jump (`update`). */
  get rest(): number {
    return this.sight.rest;
  }

  /**
   * The boxes a frame's culling marked (`boxesMarked`), and whether that frame was drawn `still` in this rest; or null
   * where it marks none for good: every box in view then taken as seen. Whether that changed what the view may want, a
   * box it takes finer seen now seen or no longer, not let go of: then the levels are to be chosen again.
   */
  see(boxes: readonly number[] | null, still: boolean): boolean {
    const { sight } = this;
    if (!boxes) {
      const was = sight.all;
      sight.all = true;
      return !was;
    }
    mark(sight.every, boxes);
    if (still) mark(sight.still, boxes);
    return this.judgeSeen();
  }

  /**
   * Which boxes are taken as seen: as the view moves, by every read; at rest, by those of frames drawn since it came to
   * rest. Whether that changed for one taken finer seen, not let go of: at rest, one now seen alone, as one no longer
   * seen keeps what it has.
   */
  private judgeSeen(): boolean {
    const { sight, still, letGo } = this;
    const { seen } = sight;
    const { reads, at } = still ? sight.still : sight.every;
    const from = still ? sight.restFrom : 0;
    const linger = still ? LINGER.still : LINGER.moving;
    const finer = this.detail?.finer;
    let changed = false;
    for (let box = 0; box < seen.length; box++) {
      const now = at[box] > from && reads - at[box] <= linger ? 1 : 0;
      if (now === seen[box]) continue;
      seen[box] = now;
      if (finer?.[box] === 1 && !letGo.has(box) && (now === 1 || !still)) changed = true;
    }
    return changed;
  }

  /** What is drawn under `rules`. */
  stats(rules: DetailRules): Omit<DetailStats, 'culled'> {
    const boxes = this.chunks.levels.map(() => 0);
    for (const level of this.drawn) if (level >= 0) boxes[level]++;
    return {
      ...rules,
      drawn: this.arena.segments,
      wanted: this.detail?.segments ?? 0,
      room: this.detail?.room ?? 0,
      base: this.arena.keepsBase,
      levels: this.chunks.levels.map(({ toleranceUm }, level) => ({
        toleranceUm,
        boxes: boxes[level],
      })),
      leftOut: this.detail?.leftOut ?? 0,
      floor: this.detail?.floor ?? -1,
    };
  }

  /**
   * The levels chosen again for `view`, a budget held to what the arena holds, and what is missing read; with `still`,
   * finer levels too; with `moved`, the camera or the view's size changed since they were last, which at rest comes to
   * rest anew. Whether there is anything to place at once (`apply`).
   */
  update(view: DetailView, rules: DetailRules, still: boolean, moved = false): boolean {
    if (this.stopped) return false;
    const { arena, sight } = this;
    if (!still || moved || rules !== this.rules) this.letGo.clear();
    // Come to rest, here or by a jump: nothing is seen until a frame drawn still is read.
    if (still && (moved || !this.still)) {
      sight.restFrom = sight.still.reads;
      sight.rest++;
    }
    this.still = still;
    this.judgeSeen();
    const budget = Math.min(rules.budget, arena.capacity - arena.baseRoom);
    // Without the culling's marks, every box in view as fine as the pixels take it.
    const finest = rules.culling && !sight.all ? this.finestFor : undefined;
    const detail = chooseDetail(
      this.chunks,
      view,
      { ...rules, budget },
      roomFor,
      arena.keepsBase,
      finest,
      this.coming?.arrived
    );
    this.arrivedMore = false;
    this.detail = detail;
    this.rules = rules;
    this.read();
    return (
      this.ready.size > 0 ||
      this.bases.size > 0 ||
      detail.levels.some((level, box) => this.atOnce(box, level) !== null)
    );
  }

  /**
   * Boxes no longer wanted let go of, and boxes that came in placed, those that make room first, until `cap` segments
   * are uploaded, one at the least. Whether what is drawn changed, and whether more is to be placed at once.
   */
  apply(cap = PLACED_SEGMENTS): { changed: boolean; more: boolean } {
    const { arena, detail, drawn } = this;
    if (this.stopped || !detail) return { changed: false, more: false };
    const wanted = detail.levels;
    let uploaded = 0;
    let changed = false;
    const full = () => uploaded >= cap;
    for (let box = 0; box < wanted.length && !full(); box++) {
      const level = wanted[box];
      const to = this.atOnce(box, level);
      if (to === null) continue;
      uploaded += arena.remove(box);
      drawn[box] = to;
      if (this.still && this.isBase(level)) this.letGo.add(box);
      changed = true;
    }
    let more = full();
    // The bases first, which take none of the room.
    for (const [box, segments] of this.bases) {
      if (uploaded > 0 && uploaded + segments.segmentCells.length > cap) {
        more = true;
        break;
      }
      uploaded += arena.putBase(box, segments);
      if (arena.sizeOf(box) === undefined) drawn[box] = this.coarsest;
      this.bases.delete(box);
      changed = true;
    }
    const arrived = [...this.ready]
      .filter(([box, { level }]) => {
        if (level === wanted[box]) return true;
        this.ready.delete(box);
        return false;
      })
      .map(([box, { level, segments }]) => ({
        box,
        level,
        segments,
        growth: arena.growthOf(box, segments.segmentCells.length),
      }))
      .sort((a, b) => a.growth - b.growth);
    for (const { box, level, segments, growth } of arrived) {
      if (growth > arena.free) continue;
      if (uploaded > 0 && uploaded + roomFor(segments.segmentCells.length) > cap) {
        more = true;
        break;
      }
      uploaded += arena.replace(box, segments);
      drawn[box] = level;
      this.ready.delete(box);
      changed = true;
    }
    return { changed, more };
  }

  /** Nothing more is read or placed, and what the arena uploads to is let go of. */
  stop(): void {
    this.stopped = true;
    this.unlisten?.();
    this.ready.clear();
    this.bases.clear();
    this.arena.dispose();
  }

  /** The segments `box` has at `level`, none at -1. */
  private segmentsAt(box: number, level: number): number {
    return level < 0 ? 0 : this.chunks.levels[level].segments[box];
  }

  /** Whether `level` is the base's, where the arena keeps one. */
  private isBase(level: number): boolean {
    return this.arena.keepsBase && level === this.coarsest;
  }

  /**
   * The level `box` goes to for `level` with no read, or null: let go of, its base (or none, where it keeps none) where
   * that is wanted, or where a coarser level is while the view moves, unless one no coarser than the floor (which keeps
   * what it has until that is read); `level`, where it has nothing at it.
   */
  private atOnce(box: number, level: number): number | null {
    const drawn = this.drawn[box];
    if (level === drawn) return null;
    const { arena } = this;
    const base = arena.hasBase(box) ? this.coarsest : -1;
    if (this.isBase(level)) return arena.sizeOf(box) !== undefined ? base : null;
    if (this.segmentsAt(box, level) === 0) return level;
    const floor = this.detail?.floor ?? -1;
    const coarser = arena.keepsBase && !this.still && level > drawn && level > floor;
    return coarser && arena.sizeOf(box) !== undefined ? base : null;
  }

  /**
   * The bases neither placed, in nor unreadable, of the pack's bytes in, a batch of them: of the boxes in `order`, or
   * else of every box.
   */
  private basesToRead(order: Uint32Array | null): BoxRead[] {
    const batch: BoxRead[] = [];
    if (this.basesRead) return batch;
    const { arena, coarsest } = this;
    const count = order ? order.length : this.drawn.length;
    let size = 0;
    let waiting = false;
    for (let i = 0; i < count; i++) {
      const box = order ? order[i] : i;
      if (arena.hasBase(box) || this.bases.has(box) || this.unread.has(box)) continue;
      if (!this.isIn(box, coarsest)) {
        waiting = true;
        continue;
      }
      batch.push({ level: coarsest, box });
      size += this.segmentsAt(box, coarsest);
      if (size >= BATCH_SEGMENTS) break;
    }
    if (!order && batch.length === 0 && !waiting) this.basesRead = true;
    return batch;
  }

  /**
   * The boxes wanted and neither drawn, in nor unreadable, a batch of them; none of the base's level, and while the
   * view moves none finer than what is drawn, nor with a base any (one wanted coarser goes back to its base).
   */
  private levelsToRead({ order, levels }: Detail): BoxRead[] {
    const { drawn } = this;
    const batch: BoxRead[] = [];
    let size = 0;
    for (const box of order) {
      const level = levels[box];
      const segments = this.segmentsAt(box, level);
      if (segments === 0 || level === drawn[box] || this.ready.get(box)?.level === level) continue;
      if (this.unread.has(box) || this.isBase(level) || !this.isIn(box, level)) continue;
      if (!this.still && (this.arena.keepsBase || (drawn[box] >= 0 && level < drawn[box])))
        continue;
      batch.push({ level, box });
      size += segments;
      if (size >= BATCH_SEGMENTS) break;
    }
    return batch;
  }

  /**
   * What is to be read, unless a batch is being read: the bases of the boxes in view, the levels wanted, and then the
   * other bases.
   */
  private read(): void {
    const { detail } = this;
    if (!detail || this.stopped || this.reading) return;
    let batch = this.basesToRead(detail.order.subarray(0, detail.inView));
    if (batch.length === 0) batch = this.levelsToRead(detail);
    if (batch.length === 0) batch = this.basesToRead(null);
    if (batch.length === 0) return;
    this.reading = true;
    this.chunks.read(batch).then(
      (read) => {
        this.reading = false;
        if (this.stopped) return;
        batch.forEach(({ level, box }, i) => {
          if (this.isBase(level)) this.bases.set(box, read[i]);
          else this.ready.set(box, { level, segments: read[i] });
        });
        this.onRead();
        this.read();
      },
      (e: unknown) => {
        this.reading = false;
        if (this.stopped || isAbort(e)) return;
        // What is drawn of them stays, and the others are read on.
        for (const { box } of batch) this.unread.add(box);
        if (!this.told) logError('Could not read the circuit morphologies', e);
        this.told = true;
        this.read();
      }
    );
  }
}
