import { FRAME_BUDGET_MS } from './mesh-choice';

/**
 * The fractions of the resolution that frames drawn while the view moves are cut to, a step at a time, wherever they
 * cost the GPU more than `FRAME_BUDGET_MS`. The first step only leaves out the ambient occlusion, and each after it
 * halves the pixels.
 */
export const MOTION_SCALES = [1, Math.SQRT1_2, 0.5, Math.SQRT1_2 / 2, 0.25];
/** The moving frames measured, the median of which decides a step. */
const SAMPLES = 3;
/** How long what a step cost is taken into account, ms: it changes as the view does. */
const REMEMBER_MS = 5000;

/** How far frames drawn while the view moves are cut down, stepped by what they cost the GPU. */
export class MotionQuality {
  /** -1 for frames as drawn still, otherwise the step in `MOTION_SCALES`. */
  private level = -1;
  private samples: number[] = [];
  /** The frame after a step is left unmeasured, as it makes the targets. */
  private skip = 0;
  /** What each step cost when last measured, by level + 1. */
  private known: ({ ms: number; at: number } | undefined)[] = [];

  /** The fraction of the resolution moving frames are drawn at, without the occlusion; null where they are in full. */
  get scale(): number | null {
    return this.level < 0 ? null : MOTION_SCALES[this.level];
  }

  /** What moving frames cost at the step they are drawn at, once measured, ms. */
  get ms(): number | null {
    return this.known[this.level + 1]?.ms ?? null;
  }

  /** Whether to measure a moving frame about to be drawn. */
  measure(): boolean {
    if (this.skip === 0) return true;
    this.skip--;
    return false;
  }

  add(ms: number, now = performance.now()): void {
    this.samples.push(ms);
    if (this.samples.length < SAMPLES) return;
    const median = [...this.samples].sort((a, b) => a - b)[SAMPLES >> 1];
    this.samples = [];
    this.known[this.level + 1] = { ms: median, at: now };
    if (median > FRAME_BUDGET_MS) {
      if (this.level < MOTION_SCALES.length - 1) this.step(1);
      return;
    }
    if (this.level < 0) return;
    // A step up doubles the pixels or brings the occlusion back, taken to double the cost, unless measured lately.
    const up = this.known[this.level];
    const cost = up && now - up.at < REMEMBER_MS ? up.ms : 2 * median;
    if (cost < 0.8 * FRAME_BUDGET_MS) this.step(-1);
  }

  /** What a frame costs changed: its size, the look, the occlusion. The step stands until frames are measured again. */
  reset(): void {
    this.samples = [];
    this.known = [];
    this.skip = 1;
  }

  private step(by: number): void {
    this.level += by;
    this.samples = [];
    this.skip = 1;
  }
}
