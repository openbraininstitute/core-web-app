import { logError } from '@/utils/logger';

import { chooseDetail, type Detail, type DetailView, SEGMENT_BUDGET } from './detail';
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
 * within the budget, and a quarter more, so that its holes seldom have to be closed.
 */
function capacityOf({ levels, boxes }: MorphologyChunks): number {
  let most = 0;
  for (let box = 0; box < boxes.length / 6; box++) {
    most += roomFor(Math.max(...levels.map((level) => level.segments[box])));
  }
  return Math.ceil(1.25 * Math.min(most, SEGMENT_BUDGET));
}

/**
 * A pack's boxes in an arena at the levels the view wants (`chooseDetail`): those it no longer wants let go of at once,
 * the others read from the pack a batch at a time, the nearest the focus first, and swapped in a box at a time as they
 * come. A box goes finer only while the view is still; coarser, at once. Placing them is paced (`apply`), so that a
 * frame uploads little.
 */
export class DetailStream {
  private chunks: MorphologyChunks;
  private arena: SegmentArena;
  private onRead: () => void;
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

  /** `onRead` is told when boxes came in, to be placed. */
  constructor(chunks: MorphologyChunks, arena: SegmentArena, onRead: () => void) {
    this.chunks = chunks;
    this.arena = arena;
    this.onRead = onRead;
    this.drawn = new Int8Array(chunks.boxes.length / 6).fill(-1);
  }

  /**
   * A stream into an arena on `geometry`, the segments' quad, as large as the pack's boxes can need, uploaded as
   * `uploadsOf` has it.
   */
  static of(
    chunks: MorphologyChunks,
    geometry: THREE.InstancedBufferGeometry,
    onRead: () => void,
    uploadsOf?: UploadsOf
  ): DetailStream {
    const arena = new SegmentArena(geometry, capacityOf(chunks), uploadsOf);
    return new DetailStream(chunks, arena, onRead);
  }

  /** The arena's quads, which draw what is placed. */
  get geometry(): THREE.InstancedBufferGeometry {
    return this.arena.geometry;
  }

  /** What is drawn under `rules`. */
  stats(rules: DetailRules): DetailStats {
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
      culled: null,
    };
  }

  /**
   * The levels chosen again for `view`, a budget held to what the arena holds, and what is missing read; with `still`,
   * finer levels too. Whether there is anything to place at once (`apply`).
   */
  update(view: DetailView, rules: DetailRules, still: boolean): boolean {
    if (this.stopped) return false;
    const budget = Math.min(rules.budget, this.arena.capacity);
    const detail = chooseDetail(this.chunks, view, { ...rules, budget }, roomFor);
    this.detail = detail;
    this.still = still;
    this.read();
    return (
      this.ready.size > 0 ||
      detail.levels.some(
        (level, box) => level !== this.drawn[box] && this.segmentsAt(box, level) === 0
      )
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
      // No read for these: let go of, or nothing at their level.
      if (level !== drawn[box] && this.segmentsAt(box, level) === 0) {
        uploaded += arena.remove(box);
        drawn[box] = level;
        changed = true;
      }
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
    let more = full();
    for (const { box, level, segments, growth } of arrived) {
      if (growth > arena.free) continue;
      if (uploaded > 0 && uploaded + roomFor(segments.segmentCells.length) > cap) {
        more = true;
        break;
      }
      uploaded += arena.remove(box) + arena.put(box, segments);
      drawn[box] = level;
      this.ready.delete(box);
      changed = true;
    }
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

  /** The boxes wanted and neither drawn, in nor unreadable, a batch of them, unless a batch is being read. */
  private read(): void {
    const { detail, drawn } = this;
    if (!detail || this.stopped || this.reading) return;
    const batch: BoxRead[] = [];
    let size = 0;
    for (const box of detail.order) {
      const level = detail.levels[box];
      const segments = this.segmentsAt(box, level);
      if (segments === 0 || level === drawn[box] || this.ready.get(box)?.level === level) continue;
      if (this.unread.has(box)) continue;
      if (!this.still && drawn[box] >= 0 && level < drawn[box]) continue;
      batch.push({ level, box });
      size += segments;
      if (size >= BATCH_SEGMENTS) break;
    }
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
