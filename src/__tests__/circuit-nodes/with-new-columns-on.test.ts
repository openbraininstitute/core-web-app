import { describe, expect, it } from 'vitest';

import { withNewColumnsOn } from '@/features/circuit-nodes/components/nodes-grid';

import type { ColumnMeta } from '@/features/circuit-nodes/types';

const columns = (...names: string[]): ColumnMeta[] =>
  names.map((name) => ({ name, kind: 'categorical' }));

describe('withNewColumnsOn', () => {
  it('turns a column that has come on, and keeps one hidden hidden', () => {
    const next = withNewColumnsOn(
      columns('pathway', 'mtype', 'layer'),
      new Set(['mtype', 'layer']),
      new Set(['mtype'])
    );

    expect([...next]).toEqual(['pathway', 'mtype']);
  });

  it('forgets a column that has gone', () => {
    const next = withNewColumnsOn(
      columns('mtype'),
      new Set(['pathway', 'mtype']),
      new Set(['pathway', 'mtype'])
    );

    expect([...next]).toEqual(['mtype']);
  });

  it('turns them all on at first', () => {
    expect([...withNewColumnsOn(columns('a', 'b'), new Set(), new Set())]).toEqual(['a', 'b']);
  });
});
