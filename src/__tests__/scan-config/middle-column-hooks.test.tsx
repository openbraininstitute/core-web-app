import { act, renderHook } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useConfigErrorsUnder,
  useDictionaryEntries,
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
    timestamps: { type: 'object' },
    stimuli: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: { amplitude: { type: 'number' } },
      },
    },
  },
} as unknown as ConfigSchema;

function config(): Config {
  return {
    info: { campaign_name: 'name' },
    neuron_sets: { A: { type: 'IDNeuronSet', ids: [1] }, B: { type: 'PredefinedNeuronSet' } },
    timestamps: { T: { type: 'SingleTimestamp' } },
    stimuli: { S: { amplitude: 'not a number' } },
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

  return { commits, wrapper, write };
}

const DICTIONARIES = ['neuron_sets', 'timestamps', 'missing'];

describe('useDictionaryEntries', () => {
  it('gives the name and type of the entries of each asked dictionary', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDictionaryEntries(DICTIONARIES), { wrapper });

    expect(result.current).toEqual({
      neuron_sets: [
        { name: 'A', type: 'IDNeuronSet' },
        { name: 'B', type: 'PredefinedNeuronSet' },
      ],
      timestamps: [{ name: 'T', type: 'SingleTimestamp' }],
      missing: [],
    });
  });

  it('keeps its value, and does not re-render, while other sections or entry fields change', () => {
    const { commits, wrapper, write } = setup();
    const { result } = renderHook(() => useDictionaryEntries(DICTIONARIES), { wrapper });
    const before = result.current;
    const commitsBefore = commits.count;

    write('info', { campaign_name: 'other' });
    write('neuron_sets', {
      A: { type: 'IDNeuronSet', ids: [1, 2, 3] },
      B: { type: 'PredefinedNeuronSet' },
    });

    expect(result.current).toBe(before);
    expect(commits.count).toBe(commitsBefore);
  });

  it('gives a new value when an entry is added, renamed or changes type', () => {
    const { wrapper, write } = setup();
    const { result } = renderHook(() => useDictionaryEntries(DICTIONARIES), { wrapper });

    write('timestamps', { T: { type: 'SingleTimestamp' }, U: { type: 'RegularTimestamps' } });
    expect(result.current.timestamps).toEqual([
      { name: 'T', type: 'SingleTimestamp' },
      { name: 'U', type: 'RegularTimestamps' },
    ]);

    write('neuron_sets', { Renamed: { type: 'IDNeuronSet', ids: [1] } });
    expect(result.current.neuron_sets).toEqual([{ name: 'Renamed', type: 'IDNeuronSet' }]);

    write('neuron_sets', { Renamed: { type: 'PredefinedNeuronSet' } });
    expect(result.current.neuron_sets).toEqual([{ name: 'Renamed', type: 'PredefinedNeuronSet' }]);
  });
});

describe('useConfigErrorsUnder', () => {
  it('gives only the errors below the path, with paths relative to it', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useConfigErrorsUnder('/stimuli'), { wrapper });

    expect(result.current.map((error) => error.instancePath)).toEqual(['/S/amplitude']);
  });

  it('keeps its value, and does not re-render, while errors change somewhere else', () => {
    const { commits, wrapper, write } = setup();
    const { result } = renderHook(() => useConfigErrorsUnder('/stimuli'), { wrapper });
    const before = result.current;
    const commitsBefore = commits.count;

    write('info', { campaign_name: '' });

    expect(result.current).toBe(before);
    expect(commits.count).toBe(commitsBefore);
  });

  it('is empty when the path has no error', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useConfigErrorsUnder('/info'), { wrapper });

    expect(result.current).toEqual([]);
  });
});
