import { describe, expect, it } from 'vitest';

import { nodeIdAxisRange } from '@/features/spike-viewer/node-id-range';

describe('nodeIdAxisRange', () => {
  it('spans the population rather than the cells that fired in it', () => {
    expect(nodeIdAxisRange(2, 10)).toEqual({ min: 0, max: 9 });
  });

  it('starts at 0 when only the high ids fired', () => {
    expect(nodeIdAxisRange(9, 10)).toEqual({ min: 0, max: 9 });
  });

  it('starts at 0 with no count to read', () => {
    expect(nodeIdAxisRange(2)).toEqual({ min: 0, max: 2 });
  });

  it('gives a single-cell model the one row', () => {
    expect(nodeIdAxisRange(0, 1)).toEqual({ min: 0, max: 0 });
  });

  it('keeps a recorded id a count disagrees with on the axis', () => {
    expect(nodeIdAxisRange(40, 10)).toEqual({ min: 0, max: 40 });
  });
});
