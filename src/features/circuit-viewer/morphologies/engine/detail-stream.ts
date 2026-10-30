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

/** The most segments asked of the pack's worker at once, so that a batch takes some milliseconds to read. */
const BATCH_SEGMENTS = 250_000;
/** The segments placed in one turn of the loop: 4 MB of upload, unless one box alone is more. */
const PLACED_SEGMENTS = Math.floor((4 * 2 ** 20) / SEGMENT_BYTES);
/**
 * For how many of the culling's reads after the last one that marked it a box still counts as seen. The reads come a
 * frame or two late. While the view moves, this is long enough that a box at the edge of sight is not let go of as it
 * comes and goes. At rest, only the reads of frames drawn since the view came to rest count, and a box lingers no
 * longer than that lateness needs.
 */
export const LINGER = { moving: 30, still: 4 } as const;

/** How many culling reads there were, and for each box the read that last marked it (0 for none). */
interface Marks {
  reads: number;
  at: Int32Array;
}

/**
 * What the culling's reads say is seen. `every` holds the marks of every read, and `still` those of the reads of frames
 * drawn still. `restFrom` is how many still reads there were when the view last came to rest, and `rest` how many times
 * it has come to rest. `seen` holds each box taken as seen; with `all`, every box in view is taken as seen and the
 * marks are read no more.
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

/** Counts one more read, which marked `boxes`. */
function mark(marks: Marks, boxes: readonly number[]): void {
  const read = ++marks.reads;
  for (const box of boxes) marks.at[box] = read;
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/**
 * How many segments an arena for a pack's boxes holds: the most room the boxes can take drawn at once, each at its
 * largest level, capped at `budget`, plus a quarter, so that its holes seldom have to be closed. With `base` (each
 * box's segments at the coarsest level), only the finer levels count towards that, and room for the base is added.
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

/** Plans an arena of `chunks` for `budget`, keeping every box's coarsest level if it then holds at most `baseUpTo`. */
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
 * Streams a pack's boxes into an arena at the levels the view wants (`chooseDetail`). Boxes the view no longer wants
 * are let go of at once. The others are read from the pack a batch at a time, nearest the focus first, and swapped in
 * a box at a time as they come. A box goes finer only while the view is still, and coarser at once. Placing is paced
 * (`apply`), so that a frame uploads little.
 *
 * Where the arena keeps a base, every box's coarsest level is read and kept: first the bases of the boxes in view,
 * then the finer levels they want, then the other bases. A box then goes back to its base with no read, and the budget
 * counts only the finer levels. With the culling's marks (`see`), a box there goes finer only while seen. A box no
 * longer seen goes back to its base as the view moves, and keeps what it has at rest. A box let go of while the view
 * rests is not asked for again until the view moves or the rules change. While the view moves, a box wanted coarser
 * goes back to its base at once, unless it is wanted at the floor (`Detail.floor`), which it never goes coarser than.
 *
 * For a pack still coming in, a box is asked for at a level only once that level's bytes are in, and is wanted no
 * finer than what is in, as if the pixels wanted no more.
 */
export class DetailStream {
  private chunks: MorphologyChunks;
  private arena: SegmentArena;
  private onRead: () => void;
  private coarsest: number;
  /** The level each box is drawn at, -1 for none. */
  private drawn: Int8Array;
  /** What the view wants, as last chosen, and the rules it was chosen by. */
  private detail: Detail | null = null;
  private rules: DetailRules | null = null;
  private still = false;
  private sight: Sight;
  /** The boxes let go of while the view has rested where it is now. */
  private letGo = new Set<number>();
  /**
   * The finest level `box` may be drawn at. A box let go of: its base. A box seen, or with nothing at its base (which
   * nothing can mark): any level. A box not seen: while the view rests, the level it is drawn at, no finer and
   * no coarser, so that no frame at rest takes away what it hides; while the view moves, or where it is not drawn,
   * its base.
   */
  private finestFor = (box: number): number => {
    const { coarsest } = this;
    if (this.letGo.has(box)) return coarsest;
    if (this.sight.seen[box] === 1 || this.segmentsAt(box, coarsest) === 0) return 0;
    const drawn = this.drawn[box];
    return this.still && drawn >= 0 ? drawn : coarsest;
  };
  /** What has come in and is not placed yet: levels by box, and bases. */
  private ready = new Map<number, { level: number; segments: MorphologySegments }>();
  private bases = new Map<number, MorphologySegments>();
  /** Whether no base is left to read: each is placed, has come in, or could not be read. */
  private basesRead: boolean;
  private reading = false;
  private stopped = false;
  /** The boxes of batches that could not be read, which are not read again, and whether that was logged. */
  private unread = new Set<number>();
  private told = false;
  /**
   * For a pack still coming in: how much is in, and the finest level of each box that is in (the number of levels where
   * none is); whether that lifted the level a box was chosen at since the levels were last chosen; and what stops the
   * notices of more coming in.
   */
  private coming: { arrival: PackArrival; arrived: Int8Array } | null = null;
  private arrivedMore = false;
  private unlisten: (() => void) | null = null;

  /**
   * `onRead` is called when boxes have come in to be placed, or more of the pack has come in to be read. The arena
   * keeps a base of the coarsest level if it keeps room for one (`SegmentArena`).
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
      // Boxes with no segments at the base's level count as drawn at it.
      for (let box = 0; box < this.drawn.length; box++) {
        if (arena.hasBase(box)) this.drawn[box] = this.coarsest;
      }
    }
    const { arrival } = chunks;
    if (arrival) {
      this.coming = { arrival, arrived: new Int8Array(count).fill(chunks.levels.length) };
      this.arrive();
      // The levels are chosen again only where a box was drawn coarser for lack of what is now in; otherwise what is
      // newly in is just read.
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

  /** Whether the levels are to be chosen again, because more of the pack has come in since they last were. */
  get moreArrived(): boolean {
    return this.arrivedMore;
  }

  /**
   * Brings the finest level of each box that is in up to what is in now. Returns whether that lifted the level a box
   * in view was held to for what was in.
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
   * Makes a stream into an arena on `geometry` (the segments' quad), as large as the pack's boxes can need within
   * `budget` and uploaded through `uploadsOf`. The arena keeps a base if it then holds at most `baseUpTo` segments.
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
   * Whether its arena holds as much as `budget` asks, and keeps a base exactly where an arena made now for `budget` and
   * `baseUpTo` would.
   */
  holds(budget: number, baseUpTo: number): boolean {
    const { capacity, base } = arenaPlan(this.chunks, budget, baseUpTo);
    return (base !== undefined) === this.arena.keepsBase && capacity <= this.arena.capacity;
  }

  /**
   * Streams its boxes again into a new arena on `geometry`, made for `budget` and uploaded the same way as its own. The
   * new arena keeps a base if it then holds no more than `baseUpTo`. Boxes this stream could not read stay left out,
   * and boxes seen stay seen. This stream stops first, so that what its arena uploads to is let go of before the new
   * arena's is made.
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

  /** Which rest the view is in: one more each time it comes to rest, in place or after a jump (`update`). */
  get rest(): number {
    return this.sight.rest;
  }

  /**
   * Takes the boxes a frame's culling marked (`boxesMarked`), and whether that frame was drawn `still` in this rest; or
   * null where the culling will mark none from now on, and every box in view is then taken as seen. Returns whether
   * that changed what the view may want, so that the levels are to be chosen again: whether a box the pixels want
   * finer, and not let go of, is now seen or no longer seen.
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
   * Works out which boxes are taken as seen: while the view moves, from every read; at rest, from the reads of frames
   * drawn since it came to rest. Returns whether that changed for a box the pixels want finer, and not let go of. At
   * rest only a box now seen counts, because a box no longer seen keeps what it has.
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
   * Chooses the levels again for `view`, with the budget held to what the arena holds, and reads what is missing. With
   * `still`, finer levels are read too. `moved` means the camera or the view's size changed since the levels were last
   * chosen; at rest, the view then comes to rest anew. Returns whether there is anything to place at once (`apply`).
   */
  update(view: DetailView, rules: DetailRules, still: boolean, moved = false): boolean {
    if (this.stopped) return false;
    const { arena, sight } = this;
    if (!still || moved || rules !== this.rules) this.letGo.clear();
    // The view came to rest, in place or after a jump: nothing counts as seen until a frame drawn still is read.
    if (still && (moved || !this.still)) {
      sight.restFrom = sight.still.reads;
      sight.rest++;
    }
    this.still = still;
    this.judgeSeen();
    const budget = Math.min(rules.budget, arena.capacity - arena.baseRoom);
    // Without the culling's marks, every box in view may go as fine as the pixels want.
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
   * Lets go of boxes no longer wanted, and places boxes that came in, those that make room first, until `cap` segments
   * are uploaded; at least one is placed. Returns whether what is drawn changed, and whether more is to be placed at
   * once.
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
    // Bases go first: they take none of the room.
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

  /** Stops reading and placing, and lets go of what the arena uploads to. */
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
   * The level `box` goes to for the wanted `level` with no read, or null for none. A placed box is let go of and goes
   * to its base (or to nothing, where no base is put) where its base is wanted, or, while the view moves, where a
   * coarser level is wanted, unless that level is no coarser than the floor: then it keeps what it has until that level
   * is read. A box with nothing at `level` goes straight to it.
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
   * A batch of the bases still to read, of the boxes in `order` or else of every box: those not placed, not come in and
   * not unreadable, whose bytes have arrived.
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
   * A batch of the boxes wanted that are not drawn, not come in and not unreadable. None at the base's level. While
   * the view moves, none finer than what is drawn, and with a base none at all (a box wanted coarser goes back to its
   * base).
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
   * Reads the next batch, unless one is being read: first the bases of the boxes in view, then the levels wanted, then
   * the other bases.
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
        // What is drawn of them stays, and reading goes on with the other boxes.
        for (const { box } of batch) this.unread.add(box);
        if (!this.told) logError('Could not read the circuit morphologies', e);
        this.told = true;
        this.read();
      }
    );
  }
}
