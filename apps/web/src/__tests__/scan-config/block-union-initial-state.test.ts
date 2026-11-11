import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useConfig } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const variant = (type: string) => ({
  title: type,
  properties: {
    type: { const: type, default: type },
    m_power: { title: 'm', default: 1 },
  },
});

const schemaWith = (oneOf: ReturnType<typeof variant>[]) =>
  ({
    properties: {
      model_type: { title: 'Model', ui_element: ScanConfigUIElementDict.BlockUnion, oneOf },
    },
  }) as unknown as ConfigSchema;

function initialState(schema: ConfigSchema, initialConfig?: Config) {
  const { result } = renderHook(() => useConfig({ schema, model: null, initialConfig }));
  return result.current[0];
}

describe('root block union initial state', () => {
  it('starts on the only variant, so the block carries its discriminator', () => {
    expect(initialState(schemaWith([variant('HH')])).model_type).toEqual({
      type: 'HH',
      m_power: 1,
    });
  });

  it('leaves the choice to the user when there are several variants', () => {
    expect(initialState(schemaWith([variant('HH'), variant('Markov')])).model_type).toEqual({});
  });

  it('keeps a saved variant', () => {
    const saved = { model_type: { type: 'HH', m_power: 3 } };
    expect(initialState(schemaWith([variant('HH')]), saved).model_type).toEqual({
      type: 'HH',
      m_power: 3,
    });
  });
});
