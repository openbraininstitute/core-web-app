import { describe, expect, it } from 'vitest';

import {
  buildColorMapping,
  CONTINUOUS_STOPS,
  NUMERIC_CATEGORICAL_MAX,
} from '@/features/scan-config/components/color-by/palette';

/** A numeric column cycling through `distinct` values, `length` nodes long. */
function numeric(distinct: number, length = distinct * 3): (string | number)[] {
  return Array.from({ length }, (_, i) => (i % distinct) + 0.5);
}

describe('colour-by mode', () => {
  it('keys a numeric property that has few enough values', () => {
    const mapping = buildColorMapping({
      property: 'layer',
      kind: 'numeric',
      values: numeric(NUMERIC_CATEGORICAL_MAX),
    });

    expect(mapping.mode).toBe('categorical');
    expect(mapping.categorical).toHaveLength(NUMERIC_CATEGORICAL_MAX);
  });

  it('scales a numeric property one value past the threshold', () => {
    const mapping = buildColorMapping({
      property: 'y',
      kind: 'numeric',
      values: numeric(NUMERIC_CATEGORICAL_MAX + 1),
    });

    expect(mapping.mode).toBe('continuous');
    // Quantized, so the palette the viewer builds stays bounded however many
    // distinct values the column holds.
    expect(new Set(mapping.colorsByNode).size).toBeLessThanOrEqual(CONTINUOUS_STOPS);
  });

  // The threshold is answered by the first values that exceed it rather than by
  // a pass over the column, so a region-scale property must not be measured by
  // how long the whole of it takes to look at.
  it('decides on a very long column without reading all of it', () => {
    const values = numeric(NUMERIC_CATEGORICAL_MAX + 1, 2_000_000);
    let read = 0;
    const counted = new Proxy(values, {
      get(target, key, receiver) {
        if (typeof key === 'string' && Number.isInteger(Number(key))) read++;
        return Reflect.get(target, key, receiver);
      },
    });

    buildColorMapping({ property: 'y', kind: 'numeric', values: counted });

    // One pass to read the values out, and nothing like a second for the
    // decision.
    expect(read).toBeLessThan(values.length * 1.5);
  });

  // Cardinality only ever decided the numeric case: a string property is a key
  // however many values it holds, since a viridis ramp over names means nothing.
  it('keys a string property whatever its cardinality', () => {
    const mapping = buildColorMapping({
      property: 'mtype',
      kind: 'string',
      values: Array.from({ length: 300 }, (_, i) => `mtype-${i}`),
    });

    expect(mapping.mode).toBe('categorical');
    expect(mapping.categorical).toHaveLength(300);
  });
});
