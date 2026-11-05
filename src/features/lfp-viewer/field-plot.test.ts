import { describe, expect, it } from 'vitest';

import { reachingPrevious } from './field-plot';

describe('reachingPrevious', () => {
  it('reaches down to a pixel below it', () => {
    expect(reachingPrevious([5, 6], [1, 2])).toEqual([2, 6]);
  });

  it('reaches up to a pixel above it', () => {
    expect(reachingPrevious([1, 2], [5, 6])).toEqual([1, 5]);
  });

  it('leaves a span that already meets the one before it', () => {
    expect(reachingPrevious([1, 4], [3, 6])).toEqual([1, 4]);
  });

  it('leaves the first pixel, which has none before it', () => {
    expect(reachingPrevious([1, 2], [-Infinity, Infinity])).toEqual([1, 2]);
  });
});
