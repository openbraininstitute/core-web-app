import { describe, expect, it } from 'vitest';

import secondsToMMSS from './convert-seconds-to-minutes';

describe('secondsToMMSS', () => {
  it('returns 00:00 for NaN', () => {
    expect(secondsToMMSS(Number.NaN)).toBe('00:00');
  });

  it('returns 00:00 for negative values', () => {
    expect(secondsToMMSS(-1)).toBe('00:00');
  });

  it('returns 00:00 for zero', () => {
    expect(secondsToMMSS(0)).toBe('00:00');
  });

  it('formats values below a minute with a zero-padded minute', () => {
    expect(secondsToMMSS(5)).toBe('00:05');
  });

  it('formats values across a minute boundary', () => {
    expect(secondsToMMSS(65)).toBe('01:05');
  });

  it('does not overflow into hours — minutes can exceed 60', () => {
    expect(secondsToMMSS(3725)).toBe('62:05');
  });

  it('floors fractional seconds', () => {
    expect(secondsToMMSS(5.9)).toBe('00:05');
  });
});
