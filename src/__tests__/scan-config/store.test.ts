import { describe, expect, it, vi } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';

import type { Config } from '@/features/scan-config/types';

const initial: Config = { info: { campaign_name: '' }, neuron_sets: {} };

describe('createScanConfigStore', () => {
  it('starts from the config it is given', () => {
    expect(createScanConfigStore(initial).getSnapshot()).toBe(initial);
  });

  it('replaces the config with a value or with an updater', () => {
    const store = createScanConfigStore(initial);
    const replaced: Config = { info: { campaign_name: 'a' } };

    store.set(replaced);
    expect(store.getSnapshot()).toBe(replaced);

    store.set((previous) => ({ ...previous, neuron_sets: { First: {} } }));
    expect(store.getSnapshot()).toEqual({
      info: { campaign_name: 'a' },
      neuron_sets: { First: {} },
    });
  });

  it('applies two updates made in a row, the second on top of the first', () => {
    const store = createScanConfigStore(initial);

    store.set((previous) => ({ ...previous, stimuli: { S0: {} } }));
    store.set((previous) => ({ ...previous, recordings: { R0: {} } }));

    expect(store.getSnapshot()).toEqual({
      ...initial,
      stimuli: { S0: {} },
      recordings: { R0: {} },
    });
  });

  it('tells subscribers once per change, and not when nothing changed', () => {
    const store = createScanConfigStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ info: { campaign_name: 'a' } });
    expect(listener).toHaveBeenCalledTimes(1);

    store.set((previous) => previous);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops telling a subscriber that left', () => {
    const store = createScanConfigStore(initial);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.set({ info: { campaign_name: 'a' } });

    expect(listener).not.toHaveBeenCalled();
  });
});
