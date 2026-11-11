import { describe, expect, it } from 'vitest';

import { hasPositions } from '@/features/circuit-nodes/population-utils';

import type { ColumnMeta } from '@/features/circuit-nodes/types';

const numeric = (name: string): ColumnMeta => ({ name, kind: 'numeric' });

describe('hasPositions', () => {
  it('is true when x, y and z are numeric columns', () => {
    expect(hasPositions([numeric('x'), numeric('y'), numeric('z'), numeric('layer')])).toBe(true);
  });

  it('is false when a coordinate is missing', () => {
    expect(hasPositions([numeric('x'), numeric('y')])).toBe(false);
  });

  it('is false when a coordinate is not numeric', () => {
    expect(hasPositions([{ name: 'x', kind: 'string' }, numeric('y'), numeric('z')])).toBe(false);
  });
});
