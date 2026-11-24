import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useReserveEntryName } from '@/features/scan-config/components/hooks';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  properties: {
    recordings: { ui_element: ScanConfigUIElementDict.BlockDictionary, singular_name: 'recording' },
  },
} as unknown as ConfigSchema;

function useForm() {
  const [config, setConfig] = useState<Config>({ recordings: { 'Recording 0': {} } });
  const reserveEntryName = useReserveEntryName({ config, schema });

  const addRecording = () => {
    const name = reserveEntryName('recordings');
    setConfig((previous) => ({
      ...previous,
      recordings: { ...(previous.recordings as object), [name]: {} },
    }));
  };

  return { config, addRecording };
}

describe('useReserveEntryName', () => {
  it('gives two entries created before a re-render different names', () => {
    const { result } = renderHook(useForm);

    act(() => {
      result.current.addRecording();
      result.current.addRecording();
    });

    expect(Object.keys(result.current.config.recordings as object)).toEqual([
      'Recording 0',
      'Recording 1',
      'Recording 2',
    ]);
  });

  it('counts on from the entries already in the config', () => {
    const { result } = renderHook(useForm);

    act(() => result.current.addRecording());
    act(() => result.current.addRecording());

    expect(Object.keys(result.current.config.recordings as object)).toEqual([
      'Recording 0',
      'Recording 1',
      'Recording 2',
    ]);
  });
});
