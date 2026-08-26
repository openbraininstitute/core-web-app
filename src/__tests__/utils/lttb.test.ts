import { describe, expect, it } from 'vitest';

import { lttbDownsample } from '@/utils/lttb';

describe('lttbDownsample', () => {
  it('returns the input verbatim when it already fits', () => {
    const { x, y } = lttbDownsample([1, 2, 3], [4, 5, 6], 10);

    expect(x).toEqual([1, 2, 3]);
    expect(y).toEqual([4, 5, 6]);
  });

  it('returns empty output for empty input', () => {
    expect(lttbDownsample([], [], 100)).toEqual({ x: [], y: [] });
  });

  it('always keeps the first and last points', () => {
    const n = 1000;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = x.map((v) => Math.sin(v / 40) * 10);

    const out = lttbDownsample(x, y, 50);

    expect(out.x[0]).toBe(0);
    expect(out.x.at(-1)).toBe(n - 1);
    expect(out.x).toHaveLength(50);
  });

  it('anchors the last bucket to the final point, not the origin', () => {
    // Every last-bucket candidate sits at -70. Against prev=(2,40) and last=(7,-70) the
    // largest triangle is at x=4; anchoring the far vertex at the origin picks x=6.
    const x = [0, 1, 2, 3, 4, 5, 6, 7];
    const y = [-70, -70, 40, -70, -70, -70, -70, -70];

    const out = lttbDownsample(x, y, 4);

    expect(out.x).toEqual([0, 2, 4, 7]);
    expect(out.y).toEqual([-70, 40, -70, -70]);
  });
});
