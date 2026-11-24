import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useReserveEntryName } from '@/features/scan-config/components/hooks';
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  properties: {
    recordings: { ui_element: ScanConfigUIElementDict.BlockDictionary, singular_name: 'recording' },
  },
} as unknown as ConfigSchema;

function setup() {
  const store = createScanConfigStore({ recordings: { 'Recording 0': {} } });
  const { result } = renderHook(() => useReserveEntryName({ store, schema }));
  const write = (recordings: Config[string]) =>
    store.set((previous) => ({ ...previous, recordings }));
  const addRecording = () => {
    const name = result.current('recordings');
    write({ ...(store.getSnapshot().recordings as object), [name]: {} });
  };
  const names = () => Object.keys(store.getSnapshot().recordings as object);

  return { reserve: () => result.current('recordings'), write, addRecording, names };
}

describe('useReserveEntryName', () => {
  it('gives two entries created in a row different names', () => {
    const { addRecording, names } = setup();

    addRecording();
    addRecording();

    expect(names()).toEqual(['Recording 0', 'Recording 1', 'Recording 2']);
  });

  it('gives two names picked before any write different values', () => {
    const { reserve } = setup();

    expect([reserve(), reserve()]).toEqual(['Recording 1', 'Recording 2']);
  });

  it('counts on from entries that something else added to the config', () => {
    const { reserve, write } = setup();

    write({ 'Recording 0': {}, 'Recording 1': {} });

    expect(reserve()).toBe('Recording 2');
  });

  it('gives a name again once its entry was written and then removed', () => {
    const { reserve, addRecording, write } = setup();

    addRecording();
    write({ 'Recording 0': {} });

    expect(reserve()).toBe('Recording 1');
  });
});
