import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useInitialConfigErrors } from '@/features/scan-config/components/hooks';

import type { Config } from '@/features/scan-config/types';

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureException }));

const schema = {
  type: 'object',
  properties: {
    stimuli: {
      type: 'object',
      additionalProperties: {
        oneOf: [{ type: 'object', properties: { type: { const: 'PoissonSpikeStimulus' } } }],
      },
    },
  },
};

describe('useInitialConfigErrors', () => {
  it('reports a saved config that uses a block the schema no longer has', () => {
    const initialConfig = { stimuli: { vpm: { type: 'SpikeStimulus' } } } as unknown as Config;
    const { result } = renderHook(() => useInitialConfigErrors({ initialConfig, schema }));

    expect(result.current?.length).toBeGreaterThan(0);
    expect(captureException).toHaveBeenCalledOnce();
  });

  it('passes a valid saved config', () => {
    captureException.mockClear();
    const initialConfig = {
      stimuli: { vpm: { type: 'PoissonSpikeStimulus' } },
    } as unknown as Config;
    const { result } = renderHook(() => useInitialConfigErrors({ initialConfig, schema }));

    expect(result.current).toBeNull();
    expect(captureException).not.toHaveBeenCalled();
  });
});
