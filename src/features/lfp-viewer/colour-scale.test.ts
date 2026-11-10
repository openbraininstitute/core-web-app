import { describe, expect, it } from 'vitest';

import { fieldLimit } from './colour-scale';

import type { LfpField } from './summary';

function minMaxField(pairs: number, low: number, high: number): LfpField {
  const data = new Int16Array(pairs * 2);
  for (let i = 0; i < pairs; i++) {
    data[i * 2] = low;
    data[i * 2 + 1] = high;
  }
  return { contacts: 1, bins: pairs, binMs: 1, start: 0, kind: 'min_max', data, scale: 0.5 };
}

describe('fieldLimit', () => {
  // These give strides of 2 and 6 before they are made odd.
  it.each([250_000, 700_000])('reads both ends of %i min/max bins', (pairs) => {
    expect(fieldLimit(minMaxField(pairs, -100, 3000))).toBe(1500);
    expect(fieldLimit(minMaxField(pairs, -3000, 100))).toBe(1500);
  });

  it('falls back on 1 µV for a silent field', () => {
    expect(fieldLimit(minMaxField(10, 0, 0))).toBe(1);
  });
});
