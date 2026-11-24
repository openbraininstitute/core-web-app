import { act, renderHook } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useEntrySummaries,
  useGetConfig,
  useHasConfigErrors,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  type: 'object',
  properties: {
    info: {
      type: 'object',
      properties: { campaign_name: { type: 'string', minLength: 1 }, note: { type: 'string' } },
    },
    neuron_sets: { type: 'object' },
  },
} as unknown as ConfigSchema;

function config(): Config {
  return {
    info: { campaign_name: '' },
    neuron_sets: { A: { type: 'IDNeuronSet', ids: [1] }, B: { type: 'PredefinedNeuronSet' } },
  };
}

function setup() {
  const store = createScanConfigStore(config());
  const commits = { count: 0 };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={schema}>
        <Profiler
          id="reader"
          onRender={() => {
            commits.count += 1;
          }}
        >
          {children}
        </Profiler>
      </ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
  const write = (section: string, value: Config[string]) =>
    act(() => store.set((previous) => ({ ...previous, [section]: value })));

  return { store, commits, wrapper, write };
}

describe('useEntrySummaries', () => {
  it('gives the name and type of each entry of a section', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useEntrySummaries('neuron_sets'), { wrapper });

    expect(result.current).toEqual([
      { name: 'A', type: 'IDNeuronSet' },
      { name: 'B', type: 'PredefinedNeuronSet' },
    ]);
  });

  it('keeps its value, and does not re-render, while only fields inside entries change', () => {
    const { commits, wrapper, write } = setup();
    const { result } = renderHook(() => useEntrySummaries('neuron_sets'), { wrapper });
    const first = result.current;
    commits.count = 0;

    write('neuron_sets', {
      A: { type: 'IDNeuronSet', ids: [1, 2, 3] },
      B: { type: 'PredefinedNeuronSet' },
    });
    write('info', { campaign_name: 'x' });

    expect(result.current).toBe(first);
    expect(commits.count).toBe(0);
  });

  it('changes when an entry is added, renamed, removed or changes type', () => {
    const { wrapper, write } = setup();
    const { result } = renderHook(() => useEntrySummaries('neuron_sets'), { wrapper });

    write('neuron_sets', { A: { type: 'IDNeuronSet' }, C: { type: 'PredefinedNeuronSet' } });
    expect(result.current.map((entry) => entry.name)).toEqual(['A', 'C']);

    write('neuron_sets', { A: { type: 'PredefinedNeuronSet' } });
    expect(result.current).toEqual([{ name: 'A', type: 'PredefinedNeuronSet' }]);
  });

  it('is empty for a section that does not exist', () => {
    const { wrapper } = setup();

    expect(renderHook(() => useEntrySummaries('stimuli'), { wrapper }).result.current).toEqual([]);
  });
});

describe('useHasConfigErrors', () => {
  it('says whether a path has schema errors', () => {
    const { wrapper, write } = setup();
    const info = renderHook(() => useHasConfigErrors('/info'), { wrapper });
    const sets = renderHook(() => useHasConfigErrors('/neuron_sets'), { wrapper });

    expect([info.result.current, sets.result.current]).toEqual([true, false]);

    write('info', { campaign_name: 'named' });

    expect(info.result.current).toBe(false);
  });

  it('does not re-render while its answer stays the same', () => {
    const { commits, wrapper, write } = setup();
    renderHook(() => useHasConfigErrors('/neuron_sets'), { wrapper });
    commits.count = 0;

    write('info', { campaign_name: 'named' });
    write('info', { campaign_name: '' });

    expect(commits.count).toBe(0);
  });
});

describe('useGetConfig', () => {
  it('returns the latest config when called, without re-rendering on changes', () => {
    const { store, commits, wrapper, write } = setup();
    const { result } = renderHook(() => useGetConfig(), { wrapper });
    commits.count = 0;

    write('info', { campaign_name: 'named' });

    expect(result.current()).toBe(store.getSnapshot());
    expect(commits.count).toBe(0);
  });
});
