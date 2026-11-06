import { describe, expect, it } from 'vitest';

import { togglePickIn } from '@/features/sonata-viewer/trace-picks';

describe('togglePickIn', () => {
  it('ticks a cell and one of its compartments apart, each in a slot of its own', () => {
    const cell = togglePickIn([], 4);
    const both = togglePickIn(cell, 4, 12);
    expect(both).toEqual([
      { nodeId: 4, slot: 0 },
      { nodeId: 4, slot: 1, traceIndex: 12 },
    ]);
    expect(togglePickIn(both, 4, 12)).toEqual([{ nodeId: 4, slot: 0 }]);
    expect(togglePickIn(both, 4)).toEqual([{ nodeId: 4, slot: 1, traceIndex: 12 }]);
  });
});
