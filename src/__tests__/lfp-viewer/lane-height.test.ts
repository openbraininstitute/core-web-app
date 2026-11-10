import { describe, expect, it } from 'vitest';

import { laneHeightOf } from '@/features/lfp-viewer/field-structure';

describe('laneHeightOf', () => {
  it('fits as many traces as show well, and is small for more, until one is picked', () => {
    expect(laneHeightOf(null, 3)).toBe('fit');
    expect(laneHeightOf(null, 64)).toBe('fit');
    expect(laneHeightOf(null, 216)).toBe('small');
  });

  it('is the one picked, however many traces', () => {
    expect(laneHeightOf('large', 216)).toBe('large');
    expect(laneHeightOf('small', 3)).toBe('small');
  });
});
