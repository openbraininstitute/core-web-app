import { describe, expect, it } from 'vitest';

import { formatCompactNumber, formatDurationFromSeconds } from './format';

describe('formatDurationFromSeconds', () => {
  it('formats mixed remainders with compact units', () => {
    expect(formatDurationFromSeconds(86_400 + 1_800)).toBe('1d 30min');
    expect(formatDurationFromSeconds(10 * 86_400 + 4 * 3_600 + 1)).toBe('10d 4h 1s');
  });

  it('omits zero units', () => {
    expect(formatDurationFromSeconds(86_400)).toBe('1d');
    expect(formatDurationFromSeconds(3_600)).toBe('1h');
    expect(formatDurationFromSeconds(60)).toBe('1min');
    expect(formatDurationFromSeconds(1)).toBe('1s');
    expect(formatDurationFromSeconds(3_661)).toBe('1h 1min 1s');
  });

  it('floors fractional seconds and treats zero as 0s', () => {
    expect(formatDurationFromSeconds(0)).toBe('0s');
    expect(formatDurationFromSeconds(1.9)).toBe('1s');
  });

  it('returns empty for non-finite or negative values', () => {
    expect(formatDurationFromSeconds(Number.NaN)).toBe('');
    expect(formatDurationFromSeconds(Number.POSITIVE_INFINITY)).toBe('');
    expect(formatDurationFromSeconds(-1)).toBe('');
  });
});

describe('formatCompactNumber precision', () => {
  it('keeps one decimal when asked', () => {
    expect(formatCompactNumber(33_198, 'en-US', 1)).toBe('33.2K');
    expect(formatCompactNumber(30_000, 'en-US', 1)).toBe('30K');
  });
});
