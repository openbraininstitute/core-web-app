import { act, renderHook } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigStoreProvider, useBlockState } from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config } from '@/features/scan-config/types';

function config(): Config {
  return {
    info: { campaign_name: 'first' },
    neuron_sets: { A: { type: 'IDNeuronSet' }, B: { type: 'IDNeuronSet' } },
  };
}

function setup(initial = config()) {
  const store = createScanConfigStore(initial);
  const commits = { count: 0 };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ScanConfigStoreProvider store={store}>
      <Profiler
        id="block"
        onRender={() => {
          commits.count += 1;
        }}
      >
        {children}
      </Profiler>
    </ScanConfigStoreProvider>
  );
  return { store, commits, wrapper };
}

describe('useBlockState', () => {
  it('reads a single block and one entry of a dictionary', () => {
    const { wrapper } = setup();

    const single = renderHook(() => useBlockState('info'), { wrapper });
    const entry = renderHook(() => useBlockState('neuron_sets', 'A'), { wrapper });

    expect(single.result.current[0]).toEqual({ campaign_name: 'first' });
    expect(entry.result.current[0]).toEqual({ type: 'IDNeuronSet' });
  });

  it('writes only its own block', () => {
    const { store, wrapper } = setup();
    const before = store.getSnapshot();
    const { result } = renderHook(() => useBlockState('neuron_sets', 'A'), { wrapper });

    act(() => result.current[1]({ type: 'IDNeuronSet', neuron_ids: [1] }));

    expect(store.getSnapshot()).toEqual({
      info: { campaign_name: 'first' },
      neuron_sets: { A: { type: 'IDNeuronSet', neuron_ids: [1] }, B: { type: 'IDNeuronSet' } },
    });
    expect(store.getSnapshot().info).toBe(before.info);
    expect(result.current[0]).toEqual({ type: 'IDNeuronSet', neuron_ids: [1] });
  });

  it('keeps two writes made in a row to two blocks', () => {
    const { store, wrapper } = setup();
    const info = renderHook(() => useBlockState('info'), { wrapper });
    const entry = renderHook(() => useBlockState('neuron_sets', 'B'), { wrapper });

    act(() => {
      info.result.current[1]({ campaign_name: 'second' });
      entry.result.current[1]({ type: 'PredefinedNeuronSet' });
    });

    expect(store.getSnapshot()).toEqual({
      info: { campaign_name: 'second' },
      neuron_sets: { A: { type: 'IDNeuronSet' }, B: { type: 'PredefinedNeuronSet' } },
    });
  });

  it('does not re-render when another block changes', () => {
    const { store, commits, wrapper } = setup();
    renderHook(() => useBlockState('neuron_sets', 'A'), { wrapper });
    commits.count = 0;

    act(() => store.set((previous) => ({ ...previous, info: { campaign_name: 'second' } })));

    expect(commits.count).toBe(0);
  });

  it('changes nothing when the section of an entry does not exist', () => {
    const { store, wrapper } = setup();
    const before = store.getSnapshot();
    const { result } = renderHook(() => useBlockState('stimuli', 'S0'), { wrapper });

    act(() => result.current[1]({ type: 'Clamp' }));

    expect(result.current[0]).toBeUndefined();
    expect(store.getSnapshot()).toBe(before);
  });
});
