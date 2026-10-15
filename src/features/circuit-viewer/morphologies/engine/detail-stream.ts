import { logError } from '@/utils/logger';

import { chooseDetail, type Detail, type DetailView } from './detail';
import { SEGMENT_BYTES } from './segment-arena';

import type {
  BoxRead,
  DetailRules,
  DetailStats,
  MorphologyChunks,
  MorphologySegments,
} from '../types';
import type { SegmentArena } from './segment-arena';

/** The most segments asked of the pack's worker at once: a batch is read in some milliseconds. */
const BATCH_SEGMENTS = 250_000;
/** The segments placed in a turn of the loop, 4 MB of upload, unless one box alone is more. */
export const PLACED_SEGMENTS = Math.floor((4 * 2 ** 20) / SEGMENT_BYTES);

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
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
  /** The levels wanted of each box, and those drawn, -1 for none. */
  private wanted: Int8Array;
  private drawn: Int8Array;
  private detail: Detail | null = null;
  private still = false;
  /** What came in and is not placed yet, by box. */
  private ready = new Map<number, { level: number; segments: MorphologySegments }>();
  /** What is being read, by box. */
  private reading = new Map<number, number>();
  private stopped = false;
  private failed = false;

  /** `onRead` is told when boxes came in, to be placed. */
  constructor(chunks: MorphologyChunks, arena: SegmentArena, onRead: () => void) {
    this.chunks = chunks;
    this.arena = arena;
    this.onRead = onRead;
    const boxes = chunks.boxes.length / 6;
    this.wanted = new Int8Array(boxes).fill(-1);
    this.drawn = new Int8Array(boxes).fill(-1);
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
    };
  }

  /**
   * The levels chosen again for `view`, a budget held to what the arena holds, and what is missing read; with `still`,
   * finer levels too. Whether there is anything to place at once (`apply`).
   */
  update(view: DetailView, rules: DetailRules, still: boolean): boolean {
    if (this.stopped) return false;
    const budget = Math.min(rules.budget, this.arena.capacity);
    this.detail = chooseDetail(this.chunks, view, { ...rules, budget });
    this.wanted = this.detail.levels;
    this.still = still;
    this.read();
    if (this.ready.size > 0) return true;
    return this.wanted.some(
      (level, box) =>
        level !== this.drawn[box] && (level < 0 || this.chunks.levels[level].segments[box] === 0)
    );
  }

  /**
   * Boxes no longer wanted let go of, and boxes that came in placed, those that make room first, until `cap` segments
   * are uploaded, one at the least. Whether what is drawn changed, and whether more is to be placed at once.
   */
  apply(cap = PLACED_SEGMENTS): { changed: boolean; more: boolean } {
    const { arena, wanted, drawn } = this;
    let uploaded = 0;
    let changed = false;
    const full = () => uploaded >= cap;
    for (let box = 0; box < wanted.length && !full(); box++) {
      const level = wanted[box];
      if (level === drawn[box]) continue;
      // No read for these: let go of, or nothing at their level.
      if (level < 0 || this.chunks.levels[level].segments[box] === 0) {
        uploaded += arena.remove(box);
        drawn[box] = level;
        changed = true;
      }
    }
    const arrived = [...this.ready].filter(([box, { level }]) => {
      if (level === wanted[box]) return true;
      this.ready.delete(box);
      return false;
    });
    const growth = ([box, { segments }]: (typeof arrived)[number]) =>
      segments.segmentCells.length - (arena.sizeOf(box) ?? 0);
    arrived.sort((a, b) => growth(a) - growth(b));
    let more = full();
    for (const entry of arrived) {
      const [box, { level, segments }] = entry;
      if (growth(entry) > arena.free) continue;
      if (uploaded > 0 && uploaded + segments.segmentCells.length > cap) {
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

  /** Nothing more is read or placed. */
  stop(): void {
    this.stopped = true;
    this.ready.clear();
  }

  /** The boxes wanted and neither drawn, in, nor being read, a batch of them, unless one is being read. */
  private read(): void {
    const { detail, wanted, drawn } = this;
    if (!detail || this.stopped || this.failed || this.reading.size > 0) return;
    const batch: BoxRead[] = [];
    let size = 0;
    for (const box of detail.order) {
      const level = wanted[box];
      const segments = level < 0 ? 0 : this.chunks.levels[level].segments[box];
      if (segments === 0 || level === drawn[box] || this.ready.get(box)?.level === level) continue;
      if (!this.still && drawn[box] >= 0 && level < drawn[box]) continue;
      batch.push({ level, box });
      size += segments;
      if (size >= BATCH_SEGMENTS) break;
    }
    if (batch.length === 0) return;
    for (const { level, box } of batch) this.reading.set(box, level);
    this.chunks.read(batch).then(
      (read) => {
        this.reading.clear();
        if (this.stopped) return;
        batch.forEach(({ level, box }, i) => {
          this.ready.set(box, { level, segments: read[i] });
        });
        this.onRead();
        this.read();
      },
      (e: unknown) => {
        this.reading.clear();
        if (this.stopped || isAbort(e)) return;
        // What is drawn stays; nothing more is read.
        this.failed = true;
        logError('Could not read the circuit morphologies', e);
      }
    );
  }
}
