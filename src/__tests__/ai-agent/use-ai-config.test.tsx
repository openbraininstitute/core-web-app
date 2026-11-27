import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { Profiler } from 'react';
import { describe, expect, it } from 'vitest';

import { agentStateAtom, configStateAtom, useAIConfig } from '@/services/ai-agent/hooks/chat';

import type { ReactNode } from 'react';
import type { Config } from '@/features/scan-config/types';

const KEY = 'circuit_simulation_config';
const withCircuit = (id: string, extra: Config = {}): Config => ({
  initialize: { circuit: { id_str: id } },
  ...extra,
});

function setup() {
  const store = createStore();
  const commits = { count: 0 };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <Profiler
        id="reader"
        onRender={() => {
          commits.count += 1;
        }}
      >
        {children}
      </Profiler>
    </Provider>
  );
  return { store, commits, wrapper };
}

describe('useAIConfig', () => {
  it('returns the AI config when it is for the circuit of the live config', () => {
    const { store, wrapper } = setup();
    const proposed = withCircuit('c1', { info: { campaign_name: 'from ai' } });
    store.set(agentStateAtom, { [KEY]: withCircuit('c1') });
    store.set(configStateAtom, proposed);

    const { result } = renderHook(() => useAIConfig(), { wrapper });

    expect(result.current.aiConfig).toBe(proposed);
  });

  it('returns no AI config when it is for another circuit, or when no live config is published', () => {
    const { store, wrapper } = setup();
    store.set(configStateAtom, withCircuit('c1'));
    const { result } = renderHook(() => useAIConfig(), { wrapper });

    expect(result.current.aiConfig).toBeNull();

    act(() => store.set(agentStateAtom, { [KEY]: withCircuit('c2') }));

    expect(result.current.aiConfig).toBeNull();
  });

  it('does not re-render when the live config changes but stays on the same circuit', () => {
    const { store, commits, wrapper } = setup();
    store.set(agentStateAtom, { [KEY]: withCircuit('c1') });
    renderHook(() => useAIConfig(), { wrapper });
    commits.count = 0;

    act(() =>
      store.set(agentStateAtom, { [KEY]: withCircuit('c1', { info: { campaign_name: 'a' } }) })
    );
    act(() =>
      store.set(agentStateAtom, { [KEY]: withCircuit('c1', { info: { campaign_name: 'ab' } }) })
    );

    expect(commits.count).toBe(0);
  });
});
