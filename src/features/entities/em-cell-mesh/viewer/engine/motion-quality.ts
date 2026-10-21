import { median } from './mesh-choice';

import type { MovingFrame } from '@/features/viewer-3d/engine/scene-viewer';
import type { ForcedMesh } from './mesh-choice';

/** The fractions of the resolution frames drawn while the view moves can be cut to: each halves the pixels. */
export const MOTION_SCALES = [1, Math.SQRT1_2, 0.5, Math.SQRT1_2 / 2, 0.25];
/** The moving frames measured, the median of which decides a step. */
const SAMPLES = 3;
/** How long what a step cost is taken into account, ms: it changes as the view does. */
const REMEMBER_MS = 5000;
/** How far within the budget a step up must keep. */
const HEADROOM = 0.8;

/** How frames drawn while the view moves are cut down: each way chosen by what frames cost ('auto'), or set. */
export interface MotionOptions {
  /** The mesh drawn while the view moves. */
  mesh: ForcedMesh;
  /** The ambient occlusion, where it is on. */
  ao: 'auto' | 'on' | 'off';
  /** The fraction of the resolution, one of `MOTION_SCALES`. */
  scale: number | 'auto';
  /** Multisampled, as still frames are. */
  antialias: boolean;
  /** What a moving frame may cost the GPU before the occlusion and the resolution are cut, ms. */
  budgetMs: number;
  /** What a full frame may cost the GPU before the stand-in is drawn while the view moves, ms. */
  standInMs: number;
  /**
   * The share of a moving frame's cost a step down in resolution must save to be kept, where frames may cost little by
   * their pixels; one that saves less is taken back, and none further tried for a while (`REMEMBER_MS`). Unset, every
   * step is kept, as is the occlusion left out, whatever it saves.
   */
  leastSaving?: number;
}

/**
 * Moving frames cut down under 45 a second, and the full mesh in them down to 31 frames a second: a turn somewhat slower
 * than 60 a second is worth the full mesh.
 */
export const DEFAULT_MOTION: MotionOptions = {
  mesh: 'auto',
  ao: 'auto',
  scale: 'auto',
  antialias: true,
  budgetMs: 22,
  standInMs: 32,
};

/**
 * What `MotionQuality` steps down through: the occlusion left out, then the pixels halved, as far as left to it, all
 * antialiased or none, as set.
 */
export function motionRungs({
  ao,
  scale,
  antialias,
}: Pick<MotionOptions, 'ao' | 'scale' | 'antialias'>): MovingFrame[] {
  const rungs = [{ ao: ao !== 'off', scale: scale === 'auto' ? 1 : scale, antialias }];
  if (ao === 'auto') rungs.push({ ...rungs[0], ao: false });
  if (scale === 'auto') {
    const last = rungs[rungs.length - 1];
    for (const s of MOTION_SCALES.slice(1)) rungs.push({ ...last, scale: s });
  }
  return rungs;
}

/** How far frames drawn while the view moves are cut down, stepped by what they cost the GPU. */
export class MotionQuality {
  private rungs: MovingFrame[] = [];
  private budgetMs = 0;
  private leastSaving = 0;
  private level = 0;
  /** The rung below which a step lately saved too little, and when. */
  private floor: { level: number; at: number } | null = null;
  private samples: number[] = [];
  /** What each rung cost when last measured. */
  private known: ({ ms: number; at: number } | undefined)[] = [];

  constructor(options: MotionOptions = DEFAULT_MOTION) {
    this.configure(options);
  }

  /** Step through the rungs `options` leave, from the top, with nothing measured yet. */
  configure(options: MotionOptions): void {
    this.rungs = motionRungs(options);
    this.budgetMs = options.budgetMs;
    this.leastSaving = options.leastSaving ?? 0;
    this.level = 0;
    this.samples = [];
    this.known = [];
    this.floor = null;
  }

  /** How moving frames are drawn now: the same object until a step, or new options. */
  get rung(): MovingFrame {
    return this.rungs[this.level];
  }

  /** What moving frames cost at the rung they are drawn at, once measured, ms. */
  get ms(): number | null {
    return this.known[this.level]?.ms ?? null;
  }

  add(ms: number, now = performance.now()): void {
    this.samples.push(ms);
    if (this.samples.length < SAMPLES) return;
    const measured = median(this.samples);
    this.samples = [];
    this.known[this.level] = { ms: measured, at: now };
    const up = this.known[this.level - 1];
    const lately = up && now - up.at < REMEMBER_MS ? up : undefined;
    if (measured > this.budgetMs) {
      const cut = this.rungs[this.level - 1]?.ao === this.rungs[this.level].ao;
      if (this.leastSaving > 0 && lately && cut && measured > (1 - this.leastSaving) * lately.ms) {
        this.floor = { level: this.level - 1, at: now };
        this.step(-1);
        return;
      }
      const floor = this.floor && now - this.floor.at < REMEMBER_MS ? this.floor.level : Infinity;
      if (this.level < Math.min(this.rungs.length - 1, floor)) this.step(1);
      return;
    }
    if (this.level === 0) return;
    // A step up doubles the pixels or brings the occlusion back, taken to double the cost, unless measured lately.
    const cost = lately ? lately.ms : 2 * measured;
    if (cost < HEADROOM * this.budgetMs) this.step(-1);
  }

  /**
   * Still frames cost `ms`, moving ones at the top no more: back to the top where that keeps within the budget. Moving
   * frames alone step up warily, and on a fast GPU might never bring the occlusion back.
   */
  still(ms: number): void {
    if (this.level === 0 || ms >= HEADROOM * this.budgetMs) return;
    this.step(-this.level);
    this.known = [];
  }

  /** What a frame costs changed: its size, the look, the occlusion. The rung stands until frames are measured again. */
  reset(): void {
    this.samples = [];
    this.known = [];
    this.floor = null;
  }

  private step(by: number): void {
    this.level += by;
    this.samples = [];
  }
}
