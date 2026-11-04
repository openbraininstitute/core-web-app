import { describe, expect, it } from 'vitest';

import { buildInitialConfigState } from '@/features/scan-config/components/hooks/schema';

import type { ConfigSchema } from '@/features/scan-config/types';

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
