import { act, renderHook } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useConfigErrors,
  useConfigValue,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  type: 'object',
  properties: {
    info: {
      type: 'object',
      properties: { campaign_name: { type: 'string', minLength: 1 }, note: { type: 'string' } },
      required: ['campaign_name'],
    },
  },
} as unknown as ConfigSchema;

function setup(initial: Config) {
  const store = createScanConfigStore(initial);
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
  return { store, commits, wrapper };
}

const setInfo = (info: Config[string]) => (previous: Config) => ({ ...previous, info });

describe('useConfigErrors', () => {
  it('reports the schema errors of the config and clears them once it is valid', () => {
    const { store, wrapper } = setup({ info: { campaign_name: '' } });
    const { result } = renderHook(() => useConfigErrors(), { wrapper });

    expect(result.current?.map((error) => error.instancePath)).toEqual(['/info/campaign_name']);

    act(() => store.set(setInfo({ campaign_name: 'first' })));

    expect(result.current).toBeNull();
  });

  it('does not re-render its readers while the errors stay the same', () => {
    const { store, commits, wrapper } = setup({ info: { campaign_name: '' } });
    renderHook(() => useConfigErrors(), { wrapper });
    commits.count = 0;

    act(() => store.set(setInfo({ campaign_name: '', note: 'a' })));
    act(() => store.set(setInfo({ campaign_name: '', note: 'ab' })));

    expect(commits.count).toBe(0);
  });
});

describe('useConfigValue with an equality check', () => {
  it('keeps the previous value, and does not re-render, when the new one is equal', () => {
    const { store, commits, wrapper } = setup({
      info: { campaign_name: 'first' },
      sets: { A: {} },
    });
    const sameNames = (a: string[], b: string[]) => a.join() === b.join();
    const { result } = renderHook(
      () => useConfigValue((config) => Object.keys(config.sets as object), sameNames),
      { wrapper }
    );
    const first = result.current;
    commits.count = 0;

    act(() => store.set(setInfo({ campaign_name: 'second' })));

    expect(result.current).toBe(first);
    expect(commits.count).toBe(0);

    act(() => store.set((previous) => ({ ...previous, sets: { A: {}, B: {} } })));

    expect(result.current).toEqual(['A', 'B']);
  });
});
