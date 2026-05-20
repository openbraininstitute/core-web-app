import { describe, expect, it } from 'vitest';

import { textColor } from './color';

describe('textColor', () => {
  it('returns white for a black background (YIQ = 0)', () => {
    expect(textColor('#000000')).toBe('white');
  });

  it('returns black for a white background (YIQ = 255)', () => {
    expect(textColor('#ffffff')).toBe('black');
  });

  it('returns black for mid-gray (YIQ = 128, threshold inclusive)', () => {
    // 0x80 = 128; YIQ = (128*299 + 128*587 + 128*114) / 1000 = 128 -> 'black'
    expect(textColor('#808080')).toBe('black');
  });

  it('throws a descriptive error for an unparseable color string', () => {
    expect(() => textColor('not-a-color')).toThrow(/Can not parse color string/);
  });
});
