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
} from '../types';

/** The most segments asked of the pack's worker at once: a batch is read in some milliseconds. */
const BATCH_SEGMENTS = 250_000;
/** The segments placed in a turn of the loop, 4 MB of upload, unless one box alone is more. */
const PLACED_SEGMENTS = Math.floor((4 * 2 ** 20) / SEGMENT_BYTES);

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/**
 * The segments an arena of a pack's boxes holds: the most room they can take drawn at once, each at its largest level,
 * within `budget`, and a quarter more, so that its holes seldom have to be closed; with `base`, at the levels finer
 * than the coarsest, beside room for every box at the coarsest.
 */
function capacityOf({ levels, boxes }: MorphologyChunks, budget: number, base: boolean): number {
  const finer = base ? levels.slice(0, -1) : levels;
  let most = 0;
  let baseRoom = 0;
  for (let box = 0; box < boxes.length / 6; box++) {
    most += roomFor(Math.max(0, ...finer.map((level) => level.segments[box])));
    if (base) baseRoom += roomFor(levels[levels.length - 1].segments[box]);
  }
  return baseRoom + Math.ceil(1.25 * Math.min(most, budget));
}

/** Whether an arena of `chunks` for `budget` keeps every box's coarsest level, holding no more than `baseUpTo`. */
function keepsBase(chunks: MorphologyChunks, budget: number, baseUpTo: number): boolean {
  return baseUpTo > 0 && capacityOf(chunks, budget, true) <= baseUpTo;
}

/**
 * A pack's boxes in an arena at the levels the view wants (`chooseDetail`): those it no longer wants let go of at once,
 * the others read from the pack a batch at a time, the nearest the focus first, and swapped in a box at a time as they
 * come. A box goes finer only while the view is still; coarser, at once. Placing them is paced (`apply`), so that a
 * frame uploads little. Where the arena keeps a base, every box's coarsest level is read first, those in view first,
 * and kept: a box goes back to it with no read, and the budget counts the finer levels alone.
 */
export class DetailStream {
  private chunks: MorphologyChunks;
  private arena: SegmentArena;
  private onRead: () => void;
  private baseUpTo: number;
  private base: boolean;
  private coarsest: number;
  /** The levels drawn of each box, -1 for none. */
  private drawn: Int8Array;
  /** What the view wants, as last chosen. */
  private detail: Detail | null = null;
  private still = false;
  /** What came in and is not placed yet, by box. */
  private ready = new Map<number, { level: number; segments: MorphologySegments }>();
  private reading = false;
  private stopped = false;
  /** The boxes of a batch that could not be read, which are read no more, and whether that was told. */
  private unread = new Set<number>();
  private told = false;

  /**
   * `onRead` is told when boxes came in, to be placed; `baseUpTo`, the most an arena made again may hold where it keeps
   * a base (0, none), which this one keeps where it keeps room for one (`SegmentArena`), of the coarsest level.
   */
  constructor(chunks: MorphologyChunks, arena: SegmentArena, onRead: () => void, baseUpTo = 0) {
    this.chunks = chunks;
    this.arena = arena;
    this.onRead = onRead;
    this.baseUpTo = baseUpTo;
    this.base = arena.keepsBase;
    this.coarsest = chunks.levels.length - 1;
    this.drawn = new Int8Array(chunks.boxes.length / 6).fill(-1);
    // Those of no segments at the base's level are drawn at it.
    for (let box = 0; this.base && box < this.drawn.length; box++) {
      if (arena.hasBase(box)) this.drawn[box] = this.coarsest;
    }
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
    const base = keepsBase(chunks, budget, baseUpTo);
    const arena = new SegmentArena(
      geometry,
      capacityOf(chunks, budget, base),
      uploadsOf,
      base ? chunks.levels[chunks.levels.length - 1].segments : undefined
    );
    return new DetailStream(chunks, arena, onRead, baseUpTo);
  }

  /** Whether its arena holds as much as `budget` asks of it, and keeps a base where `budget` would. */
  holds(budget: number): boolean {
    const base = keepsBase(this.chunks, budget, this.baseUpTo);
    return base === this.base && capacityOf(this.chunks, budget, base) <= this.arena.capacity;
  }

  /**
   * Its boxes streamed again into an arena on `geometry` made for `budget`, uploaded as its own is, those it could not
   * read left out; this stream stopped first, so that what its arena uploads to is let go of before the new one's is
   * made.
   */
  remade(budget: number, geometry: THREE.InstancedBufferGeometry): DetailStream {
    this.stop();
    const { chunks } = this;
    const base = keepsBase(chunks, budget, this.baseUpTo);
    const arena = this.arena.remade(
      geometry,
      capacityOf(chunks, budget, base),
      base ? chunks.levels[this.coarsest].segments : undefined
    );
    const stream = new DetailStream(chunks, arena, this.onRead, this.baseUpTo);
    stream.unread = this.unread;
    stream.told = this.told;
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

  /** What is drawn under `rules`. */
  stats(rules: DetailRules): Omit<DetailStats, 'culled'> {
    const boxes = this.chunks.levels.map(() => 0);
    for (const level of this.drawn) if (level >= 0) boxes[level]++;
    return {
      ...rules,
      drawn: this.arena.segments,
      wanted: this.detail?.segments ?? 0,
      levels: this.chunks.levels.map(({ toleranceUm }, level) => ({
        toleranceUm,
        boxes: boxes[level],
      })),
      leftOut: this.detail?.leftOut ?? 0,
    };
  }

  /**
   * The levels chosen again for `view`, a budget held to what the arena holds, and what is missing read; with `still`,
   * finer levels too. Whether there is anything to place at once (`apply`).
   */
  update(view: DetailView, rules: DetailRules, still: boolean): boolean {
    if (this.stopped) return false;
    const { arena } = this;
    const budget = Math.min(rules.budget, arena.capacity - arena.baseRoom);
    const detail = chooseDetail(this.chunks, view, { ...rules, budget }, roomFor, this.base);
    this.detail = detail;
    this.still = still;
    this.read();
    return this.ready.size > 0 || detail.levels.some((level, box) => this.atOnce(box, level));
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
      if (this.atOnce(box, level)) {
        uploaded += arena.remove(box);
        drawn[box] = this.isBase(level) && !arena.hasBase(box) ? -1 : level;
        changed = true;
      }
    }
    const arrived = [...this.ready]
      .filter(([box, { level }]) => {
        if (level === wanted[box] || this.isBase(level)) return true;
        this.ready.delete(box);
        return false;
      })
      .map(([box, { level, segments }]) => ({
        box,
        level,
        segments,
        growth: this.isBase(level) ? 0 : arena.growthOf(box, segments.segmentCells.length),
      }))
      .sort((a, b) => a.growth - b.growth);
    let more = full();
    for (const { box, level, segments, growth } of arrived) {
      if (growth > arena.free) continue;
      if (uploaded > 0 && uploaded + roomFor(segments.segmentCells.length) > cap) {
        more = true;
        break;
      }
      if (!this.isBase(level)) {
        uploaded += arena.remove(box) + arena.put(box, segments);
        drawn[box] = level;
      } else {
        uploaded += arena.putBase(box, segments);
        if (arena.sizeOf(box) === undefined) drawn[box] = level;
      }
      this.ready.delete(box);
      changed = true;
    }
    // A finer level is read once the base is placed.
    if (changed) this.read();
    return { changed, more };
  }

  /** Nothing more is read or placed, and what the arena uploads to is let go of. */
  stop(): void {
    this.stopped = true;
    this.ready.clear();
    this.arena.dispose();
  }

  /** The segments `box` has at `level`, none at -1. */
  private segmentsAt(box: number, level: number): number {
    return level < 0 ? 0 : this.chunks.levels[level].segments[box];
  }

  /** Whether `level` is the base's, where the arena keeps one. */
  private isBase(level: number): boolean {
    return this.base && level === this.coarsest;
  }

  /** Whether `box` goes to `level` with no read: let go of, its base drawn in its place, or nothing at its level. */
  private atOnce(box: number, level: number): boolean {
    if (level === this.drawn[box]) return false;
    if (this.isBase(level)) return this.arena.sizeOf(box) !== undefined;
    return this.segmentsAt(box, level) === 0;
  }

  /**
   * The bases neither placed, in nor unreadable, those in view first, a batch of them; null where none is to come, and
   * none while they are placed.
   */
  private basesToRead({ order }: Detail): BoxRead[] | null {
    if (!this.base) return null;
    const { arena, coarsest } = this;
    const count = this.drawn.length;
    const asked = new Uint8Array(count);
    const batch: BoxRead[] = [];
    let missing = false;
    let size = 0;
    for (const box of [...order, ...Array.from({ length: count }, (_, b) => b)]) {
      if (asked[box] || arena.hasBase(box) || this.unread.has(box)) continue;
      asked[box] = 1;
      missing = true;
      if (this.ready.has(box)) continue;
      batch.push({ level: coarsest, box });
      size += this.segmentsAt(box, coarsest);
      if (size >= BATCH_SEGMENTS) break;
    }
    return missing ? batch : null;
  }

  /** The boxes wanted and neither drawn, in nor unreadable, a batch of them; none of the base's level. */
  private levelsToRead({ order, levels }: Detail): BoxRead[] {
    const { drawn } = this;
    const batch: BoxRead[] = [];
    let size = 0;
    for (const box of order) {
      const level = levels[box];
      const segments = this.segmentsAt(box, level);
      if (segments === 0 || level === drawn[box] || this.ready.get(box)?.level === level) continue;
      if (this.unread.has(box) || this.isBase(level)) continue;
      if (!this.still && drawn[box] >= 0 && level < drawn[box]) continue;
      batch.push({ level, box });
      size += segments;
      if (size >= BATCH_SEGMENTS) break;
    }
    return batch;
  }

  /** What is to be read (`basesToRead`, else `levelsToRead`), unless a batch is being read. */
  private read(): void {
    const { detail } = this;
    if (!detail || this.stopped || this.reading) return;
    const batch = this.basesToRead(detail) ?? this.levelsToRead(detail);
    if (batch.length === 0) return;
    this.reading = true;
    this.chunks.read(batch).then(
      (read) => {
        this.reading = false;
        if (this.stopped) return;
        batch.forEach(({ level, box }, i) => {
          this.ready.set(box, { level, segments: read[i] });
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
