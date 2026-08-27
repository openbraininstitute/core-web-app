import { describe, expect, it } from 'vitest';

import {
  buildColorMapping,
  CONTINUOUS_STOPS,
  NUMERIC_CATEGORICAL_MAX,
} from '@/features/scan-config/components/color-by/palette';

/** A numeric column cycling through `distinct` values, `length` nodes long. */
function numeric(distinct: number, length = distinct * 3) {
  return {
    kind: 'numeric' as const,
    values: Float64Array.from({ length }, (_, i) => (i % distinct) + 0.5),
  };
}

describe('colour-by mode', () => {
  it('keys a numeric property that has few enough values', () => {
    const mapping = buildColorMapping({
      property: 'layer',
      column: numeric(NUMERIC_CATEGORICAL_MAX),
    });

    expect(mapping.mode).toBe('categorical');
    expect(mapping.categorical).toHaveLength(NUMERIC_CATEGORICAL_MAX);
  });

  it('scales a numeric property one value past the threshold', () => {
    const mapping = buildColorMapping({
      property: 'y',
      column: numeric(NUMERIC_CATEGORICAL_MAX + 1),
    });

    expect(mapping.mode).toBe('continuous');
    // Quantized, so the palette the viewer builds stays bounded however many
    // distinct values the column holds.
    expect(mapping.palette.length).toBeLessThanOrEqual(CONTINUOUS_STOPS);
    expect(Math.max(...mapping.columnByNode)).toBeLessThan(CONTINUOUS_STOPS);
  });

  // The threshold is decided by the first values that exceed it rather than by
  // a pass over the whole column, so the cost must not scale with the column's
  // length.
  it('decides on a very long column without reading all of it', () => {
    const { values } = numeric(NUMERIC_CATEGORICAL_MAX + 1, 2_000_000);
    let read = 0;
    const counted = new Proxy(values, {
      get(target, key) {
        if (typeof key === 'string' && Number.isInteger(Number(key))) read++;
        return Reflect.get(target, key);
      },
    });

    buildColorMapping({ property: 'y', column: { kind: 'numeric', values: counted } });

    // Two passes build the scale, one for the bounds and one for the stops.
    // The mode decision must not add anything like a third.
    expect(read).toBeLessThan(values.length * 2.5);
  });

  // Cardinality only ever decided the numeric case. A string property is keyed
  // however many values it holds, since a viridis ramp over names would mean
  // nothing.
  it('keys a string property whatever its cardinality', () => {
    const mapping = buildColorMapping({
      property: 'mtype',
      column: {
        kind: 'string',
        values: Array.from({ length: 300 }, (_, i) => `mtype-${i}`),
      },
    });

    expect(mapping.mode).toBe('categorical');
    expect(mapping.categorical).toHaveLength(300);
  });

  // The main path at scale: the key is built from the library and the per-node
  // pass stays on the indices, so no string is created per node.
  it('keys a categorical property from its library and indices', () => {
    const mapping = buildColorMapping({
      property: 'mtype',
      column: {
        kind: 'categorical',
        library: ['L5_TPC', 'L1_DAC', 'L23_MC'],
        indices: Uint32Array.from([0, 2, 2, 0]),
      },
    });

    expect(mapping.mode).toBe('categorical');
    // Only the values present, in stable (sorted) order, with their counts.
    expect(mapping.categorical?.map(({ value, count }) => ({ value, count }))).toEqual([
      { value: 'L23_MC', count: 2 },
      { value: 'L5_TPC', count: 2 },
    ]);
    // Every node samples the palette column of its own value.
    const byNode = [...mapping.columnByNode].map((column) => mapping.palette[column]);
    expect(byNode).toEqual([
      mapping.categorical?.[1].color,
      mapping.categorical?.[0].color,
      mapping.categorical?.[0].color,
      mapping.categorical?.[1].color,
    ]);
  });
});
