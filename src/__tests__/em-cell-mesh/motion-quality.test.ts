// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { FRAME_BUDGET_MS } from '@/features/entities/em-cell-mesh/viewer/engine/mesh-choice';
import {
  MOTION_SCALES,
  MotionQuality,
} from '@/features/entities/em-cell-mesh/viewer/engine/motion-quality';

/** Three moving frames measured at `ms`, at `now`, after the frames a step skips. */
function frames(q: MotionQuality, ms: number, now = 0): void {
  for (let i = 0; i < 10 && !q.measure(); i++);
  for (let i = 0; i < 3; i++) q.add(ms, now);
}

describe('MotionQuality', () => {
  it('draws moving frames as still ones while they keep within the budget', () => {
    const q = new MotionQuality();
    expect(q.scale).toBeNull();
    expect(q.ms).toBeNull();
    frames(q, FRAME_BUDGET_MS - 1);
    expect(q.scale).toBeNull();
    expect(q.ms).toBe(FRAME_BUDGET_MS - 1);
  });

  it('leaves out the occlusion first, then halves the pixels a step at a time, down to the last step', () => {
    const q = new MotionQuality();
    const scales: (number | null)[] = [];
    for (let i = 0; i < MOTION_SCALES.length + 2; i++) {
      frames(q, 3 * FRAME_BUDGET_MS);
      scales.push(q.scale);
    }
    expect(scales).toEqual([...MOTION_SCALES, 0.25, 0.25]);
    expect(MOTION_SCALES.slice(1).map((s, i) => (s / MOTION_SCALES[i]) ** 2)).toEqual(
      MOTION_SCALES.slice(1).map(() => expect.closeTo(0.5))
    );
  });

  it('decides on the median of three frames, and skips the one after a step, which makes the targets', () => {
    const q = new MotionQuality();
    q.add(100, 0);
    q.add(5, 0);
    q.add(6, 0);
    expect(q.scale).toBeNull();
    for (const ms of [100, 30, 5]) q.add(ms, 0);
    expect(q.scale).toBe(1);
    expect(q.ms).toBeNull();
    expect(q.measure()).toBe(false);
    expect(q.measure()).toBe(true);
  });

  it('steps back up where twice the cost keeps within the budget, but not soon into a step just measured over it', () => {
    const q = new MotionQuality();
    frames(q, 30, 0);
    frames(q, 20, 0);
    expect(q.scale).toBe(MOTION_SCALES[1]);
    frames(q, 2, 1000);
    expect(q.scale).toBe(MOTION_SCALES[1]);
    frames(q, 2, 6000);
    expect(q.scale).toBe(1);
    // Twice 6 ms would come too close to the budget.
    frames(q, 6, 6000);
    expect(q.scale).toBe(1);
    frames(q, 4, 6000);
    expect(q.scale).toBeNull();
  });

  it('keeps its step through a change of what frames cost, and measures again after skipping one', () => {
    const q = new MotionQuality();
    frames(q, 30);
    frames(q, 8);
    expect(q.ms).toBe(8);
    q.reset();
    expect(q.scale).toBe(1);
    expect(q.ms).toBeNull();
    expect(q.measure()).toBe(false);
    expect(q.measure()).toBe(true);
  });
});
