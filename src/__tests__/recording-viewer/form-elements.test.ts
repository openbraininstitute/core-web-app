import { describe, expect, it } from 'vitest';

import { buildInitialConfigState } from '@/features/scan-config/components/hooks/schema';
import { parseIntList } from '@/features/scan-config/components/ui-elements/int-list-optional';
import { parseJsonObject } from '@/features/scan-config/components/ui-elements/json-object';

import type { ConfigSchema } from '@/features/scan-config/types';

describe('parseIntList', () => {
  it('reads whole numbers, and an empty text as unset', () => {
    expect(parseIntList(' 1, 2 ,30 ')).toEqual([1, 2, 30]);
    expect(parseIntList('  ')).toBeNull();
  });

  it('refuses anything else', () => {
    expect(parseIntList('1, a')).toBeUndefined();
    expect(parseIntList('1.5')).toBeUndefined();
  });
});

describe('parseJsonObject', () => {
  it('reads an object, and an empty text as an empty one', () => {
    expect(parseJsonObject('{"a": [1]}')).toEqual({ object: { a: [1] } });
    expect(parseJsonObject(' ')).toEqual({ object: {} });
  });

  it('says why anything else is refused', () => {
    expect(parseJsonObject('[1]')).toHaveProperty('error');
    expect(parseJsonObject('{a')).toHaveProperty('error');
  });
});

describe('a block union with a declared default', () => {
  const variant = (type: string) => ({ properties: { type: { const: type } } });
  const schema = {
    properties: {
      temporal_filter: {
        ui_element: 'block_union',
        oneOf: [variant('A'), variant('B')],
        default: { type: 'A', freq_min: 300 },
      },
      no_default: { ui_element: 'block_union', oneOf: [variant('A'), variant('B')] },
    },
  } as unknown as ConfigSchema;

  it('starts on it', () => {
    const state = buildInitialConfigState(schema, undefined, null);

    expect(state.temporal_filter).toEqual({ type: 'A', freq_min: 300 });
    expect(state.no_default).toEqual({});
  });

  it('keeps what a stored config chose', () => {
    const state = buildInitialConfigState(
      schema,
      { temporal_filter: { type: 'B' } } as never,
      null
    );

    expect(state.temporal_filter).toEqual({ type: 'B' });
  });
});
