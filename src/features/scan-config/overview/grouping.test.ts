import { describe, expect, it } from 'vitest';

import { blocksNaming, entityIdsIn, groupRefs, refTypeLabel } from './grouping';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('groupRefs', () => {
  it('keeps one or two of a type apart and groups more, in order, without duplicates', () => {
    const groups = groupRefs([
      { id: id(1), type: 'morphology' },
      { id: id(2), type: 'channel' },
      { id: id(3), type: 'channel' },
      { id: id(1), type: 'morphology' },
      { id: id(4), type: 'channel' },
      { id: id(5), type: 'emodel' },
    ]);
    expect(groups.map((g) => [g.key, g.refs.length])).toEqual([
      [id(1), 1],
      ['group:channel', 3],
      [id(5), 1],
    ]);
  });
});

describe('refTypeLabel', () => {
  it('reads a FromID class or a snake-case type', () => {
    expect(refTypeLabel('IonChannelModelFromID')).toBe('Ion channel model');
    expect(refTypeLabel('validation_result')).toBe('Validation result');
  });
});

describe('entityIdsIn and blocksNaming', () => {
  const target = { type: 'TargetEFeatures', task_result: { id_str: id(7) }, seed: 1 };
  it('finds the ids a block picks under id-like keys only', () => {
    expect(entityIdsIn(target)).toEqual([id(7)]);
    expect(entityIdsIn({ name: id(8), list_ids: [id(9), 'x'] })).toEqual([id(9)]);
  });
  it('finds the blocks naming an id', () => {
    expect(
      blocksNaming(
        [id(7)],
        [
          { id: 'target', value: target },
          { id: 'other', value: { seed: 1 } },
        ]
      )
    ).toEqual(['target']);
  });
});
