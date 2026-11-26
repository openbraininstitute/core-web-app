import { describe, expect, it } from 'vitest';

import { reverseOf, stopFrom } from './stops';

const STOPS = [0, 900, 1800, 2700];

describe('stopFrom', () => {
  it('goes to the next stop down or up from a resting place', () => {
    expect(stopFrom(STOPS, 900, 1)).toBe(1800);
    expect(stopFrom(STOPS, 900, -1)).toBe(0);
  });

  it('goes on past where a glide is headed, not back to it', () => {
    // Gliding down from 900 to 1800, at 1700: counted from 1800, a turn down reaches 2700, not 1800 again.
    expect(stopFrom(STOPS, 1700, 1)).toBe(1800);
    expect(stopFrom(STOPS, 1800, 1)).toBe(2700);
    // Gliding up from 2700 to 1800, at 1926: counted from 1800, a turn up reaches 900 rather than 1800 again.
    expect(stopFrom(STOPS, 1926, -1)).toBe(1800);
    expect(stopFrom(STOPS, 1800, -1)).toBe(900);
  });

  it('ignores stops within 2 px, and has none past the ends', () => {
    expect(stopFrom(STOPS, 1801, -1)).toBe(900);
    expect(stopFrom(STOPS, 0, -1)).toBeNull();
    expect(stopFrom(STOPS, 2700, 1)).toBeNull();
  });
});

describe('reverseOf', () => {
  const none = { px: 0, events: 0 };
  const run = (deltas: number[], heldWay: number) =>
    deltas.reduce<ReturnType<typeof reverseOf>>((at, delta) => reverseOf(at, delta, heldWay), {
      ...none,
      back: false,
    });

  it('takes stray reversed ticks as a down swipe ends for no going back', () => {
    expect(run([-6], 1).back).toBe(false);
    expect(run([-30], 1).back).toBe(false);
    expect(run([-6, -30], 1).back).toBe(false);
    expect(run([-50, -40], 1).back).toBe(false);
  });

  it('takes a reversed swipe, or a mouse notch, for going back', () => {
    expect(run([-15, -25, -30], 1).back).toBe(true);
    expect(run([-100], 1).back).toBe(true);
    expect(run([100], -1).back).toBe(true);
  });

  it('starts again on an event the held way, and holds nothing when no turn is held', () => {
    expect(run([-30, -20, 8, -30], 1).back).toBe(false);
    expect(run([-100], 0).back).toBe(false);
  });
});
