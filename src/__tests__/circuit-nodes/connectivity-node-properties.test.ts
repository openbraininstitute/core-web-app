import { describe, expect, it } from 'vitest';

import {
  nodeColumnOptions,
  nodeProperty,
  RANGES,
} from '@/features/circuit-nodes/connectivity/node-properties';

import type { ColumnMeta } from '@/features/circuit-nodes/types';

describe('nodeColumnOptions', () => {
  const columns: ColumnMeta[] = [
    { name: 'node_id', kind: 'numeric' },
    { name: 'mtype', kind: 'categorical', library: ['L4_TPC'] },
    { name: 'region', kind: 'categorical', library: ['S1FL', 'S1HL'] },
    { name: 'morphology', kind: 'categorical', library: Array.from({ length: 500 }, String) },
    { name: 'me_combo', kind: 'string' },
    { name: 'y', kind: 'numeric' },
    { name: 'orientation_w', kind: 'numeric' },
  ];

  it('offers the columns with a few values, and numbers in ranges, but not the matrix’s own', () => {
    expect(nodeColumnOptions(columns, new Set(['mtype']))).toEqual([
      { name: 'region', ranges: false },
      { name: 'y', ranges: true },
    ]);
  });
});

describe('nodeProperty', () => {
  it('keeps a categorical column’s library and codes', () => {
    const property = nodeProperty('region', {
      kind: 'categorical',
      library: ['S1FL', 'S1HL'],
      indices: Uint32Array.from([1, 0, 1]),
    });

    expect(property).toEqual({
      name: 'region',
      library: ['S1FL', 'S1HL'],
      codes: Int32Array.from([1, 0, 1]),
    });
  });

  it('takes a number of few values as they are, in order', () => {
    const property = nodeProperty('layer', {
      kind: 'numeric',
      values: Float64Array.from([4, 2, 4, Number.NaN, 6]),
    });

    expect(property.library).toEqual(['2', '4', '6']);
    expect([...property.codes]).toEqual([1, 0, 1, -1, 2]);
    expect(property.ordered).toBe(true);
  });

  it('puts a number of many values in equal ranges, in order', () => {
    const values = Float64Array.from({ length: 101 }, (_, i) => i * 10);
    const property = nodeProperty('y', { kind: 'numeric', values });

    expect(property.library).toHaveLength(RANGES);
    expect(property.library[0]).toBe('0 to 100');
    expect(property.codes[0]).toBe(0);
    expect(property.codes[100]).toBe(RANGES - 1);
    expect(property.ordered).toBe(true);
  });
});
