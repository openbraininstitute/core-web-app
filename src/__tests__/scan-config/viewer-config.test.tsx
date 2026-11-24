import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useViewerConfig,
  viewerConfigOf,
} from '@/features/scan-config/components/model-preview/viewer-config';
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigStoreProvider } from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { Config } from '@/features/scan-config/types';

const arrayRef = {
  type: 'SimulatableExtracellularRecordingArrayFromID',
  id_str: '2f1a9c1e-6e1d-4a4a-9b6f-0f4c1d2e3a4b',
};

function config(): Config {
  return {
    info: { campaign_name: 'first' },
    initialize: { duration: 1000 },
    neuron_sets: { A: { type: 'IDNeuronSet' } },
    morphology_locations: { L0: { type: 'ExplicitLocations' } },
    electrode_locations: { E0: { type: 'ElectrodeArray' } },
    stimuli: { S0: { type: 'Clamp', amplitude: 1 } },
    recordings: { R0: { type: 'ArrayRecording', extracellular_recording_array: arrayRef } },
  };
}

function setup(initial = config()) {
  const store = createScanConfigStore(initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ScanConfigStoreProvider store={store}>{children}</ScanConfigStoreProvider>
  );
  return { store, ...renderHook(() => useViewerConfig(), { wrapper }) };
}

describe('viewerConfigOf', () => {
  it('keeps the sections the viewer reads and the ones that reference a recording array', () => {
    const full = config();

    expect(viewerConfigOf(full)).toEqual({
      morphology_locations: full.morphology_locations,
      electrode_locations: full.electrode_locations,
      recordings: full.recordings,
    });
  });

  it('keeps no section of a config that has nothing for the viewer', () => {
    expect(viewerConfigOf({ info: { campaign_name: 'first' }, stimuli: { S0: {} } })).toEqual({});
  });
});

describe('useViewerConfig', () => {
  it('returns the same object while only other sections change', () => {
    const { store, result } = setup();
    const first = result.current;

    act(() => store.set((previous) => ({ ...previous, info: { campaign_name: 'second' } })));
    act(() => store.set((previous) => ({ ...previous, stimuli: { S0: { amplitude: 2 } } })));
    act(() => store.set((previous) => ({ ...previous, neuron_sets: { A: {}, B: {} } })));

    expect(result.current).toBe(first);
  });

  it('returns a new object when a section the viewer reads changes', () => {
    const { store, result } = setup();
    const first = result.current;

    act(() => store.set((previous) => ({ ...previous, morphology_locations: { L0: {}, L1: {} } })));

    expect(result.current).not.toBe(first);
    expect(result.current.morphology_locations).toEqual({ L0: {}, L1: {} });
  });

  it('picks up a section once one of its blocks references a recording array', () => {
    const { store, result } = setup();

    act(() =>
      store.set((previous) => ({
        ...previous,
        stimuli: { S0: { type: 'Clamp', extracellular_recording_array: arrayRef } },
      }))
    );

    expect(Object.keys(result.current).sort()).toEqual([
      'electrode_locations',
      'morphology_locations',
      'recordings',
      'stimuli',
    ]);
  });
});
