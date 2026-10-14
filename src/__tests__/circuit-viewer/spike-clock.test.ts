import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpikeClock } from '@/features/circuit-viewer/spike-clock';

/** Cell 0 fires at 10 ms and cell 1 at 50, in a recording of 100 ms. */
const SPIKES = {
  cellIndices: Uint32Array.of(0, 1),
  times: Float32Array.of(10, 50),
  timeMinInMs: 0,
  timeMaxInMs: 100,
};

// The rest of what the clock does is pinned through the engine that runs it, in `circuit-morphology-viewer.test.ts`.
describe('the spike clock', () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps a seek within the spikes, and takes no number for their start', () => {
    const clock = new SpikeClock();
    clock.setSpikes(SPIKES, 2);
    clock.timeInMs = 250;
    expect(clock.timeInMs).toBe(100);
    clock.timeInMs = -5;
    expect(clock.timeInMs).toBe(0);
    clock.timeInMs = 40;
    clock.timeInMs = Number.NaN;
    expect(clock.timeInMs).toBe(0);
  });

  it('moves on no further in a slow frame than a glow lasts, so that it skips no spike', () => {
    const clock = new SpikeClock();
    clock.setSpikes(SPIKES, 2);
    // A spike glows for five times 0.01 s at 100 ms a second: 5 ms, where a 100 ms frame would move on by 10.
    clock.afterglowInSeconds = 0.01;
    clock.timeInMs = 6;
    clock.playing = true;
    now += 100;
    expect(clock.advance()).toBe(false);
    expect(clock.timeInMs).toBeCloseTo(11);
    expect(clock.glow[0]).toBeGreaterThan(0);
  });

  it('warns once of spikes out of order', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const clock = new SpikeClock();
    clock.setSpikes({ ...SPIKES, times: Float32Array.of(50, 10, 5) }, 2);
    expect(warn).toHaveBeenCalledTimes(1);
    clock.setSpikes(SPIKES, 2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
