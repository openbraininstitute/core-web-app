// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MOTION,
  MOTION_SCALES,
  type MotionOptions,
  MotionQuality,
  motionRungs,
} from '@/features/entities/em-cell-mesh/viewer/engine/motion-quality';

const BUDGET = DEFAULT_MOTION.budgetMs;
const TOP = { ao: true, scale: 1, antialias: true };
const NO_AO = { ...TOP, ao: false };

/** Three moving frames measured at `ms`, at `now`. */
function frames(q: MotionQuality, ms: number, now = 0): void {
  for (let i = 0; i < 3; i++) q.add(ms, now);
}

/** The rungs a quality steps down through, frames far over the budget at each. */
function stepsDown(options: Partial<MotionOptions> = {}): string[] {
  const q = new MotionQuality({ ...DEFAULT_MOTION, ...options });
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    const { ao, scale } = q.rung;
    seen.push(`${ao ? 'ao' : '-'} ${Math.round(100 * scale)}`);
    frames(q, 10 * BUDGET);
  }
  return [...new Set(seen)];
}

describe('MotionQuality', () => {
  it('draws moving frames as still ones while they keep within the budget', () => {
    const q = new MotionQuality();
    expect(q.rung).toEqual(TOP);
    expect(q.ms).toBeNull();
    frames(q, BUDGET - 1);
    expect(q.rung).toEqual(TOP);
    expect(q.ms).toBe(BUDGET - 1);
  });

  it('leaves out the occlusion first, then halves the pixels a step at a time, down to the last step', () => {
    expect(stepsDown()).toEqual(['ao 100', '- 100', '- 71', '- 50', '- 35', '- 25']);
    expect(MOTION_SCALES.slice(1).map((s, i) => (s / MOTION_SCALES[i]) ** 2)).toEqual(
      MOTION_SCALES.slice(1).map(() => expect.closeTo(0.5))
    );
  });

  it('steps only through what is left to it: the occlusion kept or left out, or the resolution set', () => {
    expect(stepsDown({ ao: 'on' })).toEqual(['ao 100', 'ao 71', 'ao 50', 'ao 35', 'ao 25']);
    expect(stepsDown({ ao: 'off' })).toEqual(['- 100', '- 71', '- 50', '- 35', '- 25']);
    expect(stepsDown({ scale: 0.5 })).toEqual(['ao 50', '- 50']);
    expect(stepsDown({ ao: 'on', scale: Math.SQRT1_2 })).toEqual(['ao 71']);
    expect(motionRungs({ ao: 'off', scale: 1, antialias: false })).toEqual([
      { ao: false, scale: 1, antialias: false },
    ]);
  });

  it('cuts down past the budget set', () => {
    const q = new MotionQuality({ ...DEFAULT_MOTION, budgetMs: 30 });
    frames(q, 25);
    expect(q.rung).toEqual(TOP);
    frames(q, 31);
    expect(q.rung).toEqual(NO_AO);
  });

  it('decides on the median of three frames, and measures a step afresh', () => {
    const q = new MotionQuality();
    q.add(100, 0);
    q.add(5, 0);
    q.add(6, 0);
    expect(q.rung.ao).toBe(true);
    for (const ms of [100, 30, 5]) q.add(ms, 0);
    expect(q.rung).toEqual(NO_AO);
    expect(q.ms).toBeNull();
  });

  it('steps back up where twice the cost keeps within the budget, but not soon into a step just measured over it', () => {
    const q = new MotionQuality();
    frames(q, 2 * BUDGET, 0);
    frames(q, 1.2 * BUDGET, 0);
    expect(q.rung.scale).toBe(MOTION_SCALES[1]);
    frames(q, 2, 1000);
    expect(q.rung.scale).toBe(MOTION_SCALES[1]);
    frames(q, 2, 6000);
    expect(q.rung).toEqual(NO_AO);
    // Twice this would come too close to the budget.
    frames(q, 0.45 * BUDGET, 6000);
    expect(q.rung).toEqual(NO_AO);
    frames(q, 0.3 * BUDGET, 6000);
    expect(q.rung).toEqual(TOP);
  });

  it('goes back to the top at once where still frames, drawn in full, keep well within the budget', () => {
    const q = new MotionQuality();
    frames(q, 2 * BUDGET);
    frames(q, 1.2 * BUDGET);
    expect(q.rung.scale).toBe(MOTION_SCALES[1]);
    q.still(0.8 * BUDGET);
    expect(q.rung.scale).toBe(MOTION_SCALES[1]);
    q.still(0.5 * BUDGET);
    expect(q.rung).toEqual(TOP);
    expect(q.ms).toBeNull();
  });

  it('keeps its step through a change of what frames cost, and starts again from the top with new options', () => {
    const q = new MotionQuality();
    frames(q, 30);
    frames(q, 8);
    expect(q.ms).toBe(8);
    const rung = q.rung;
    q.reset();
    expect(q.rung).toBe(rung);
    expect(q.ms).toBeNull();

    q.configure({ ...DEFAULT_MOTION, ao: 'on' });
    const top = q.rung;
    expect(top).toEqual(TOP);
    // Rungs of their own, though the same: a frame drawn at one is told from those drawn before.
    q.configure({ ...DEFAULT_MOTION, ao: 'on' });
    expect(q.rung).toEqual(top);
    expect(q.rung).not.toBe(top);
  });
});
