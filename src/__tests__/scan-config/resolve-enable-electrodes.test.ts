import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { resolveEnableElectrodes } from '@/features/scan-config/components/model-preview/resolve-enable-electrodes';

describe('resolveEnableElectrodes', () => {
  it('is off when the feature flag is off', () => {
    expect(
      resolveEnableElectrodes({
        featureEnabled: false,
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(false);
    expect(resolveEnableElectrodes({ featureEnabled: false, largeCircuit: true })).toBe(false);
  });

  it('keeps singles off even when the flag is on', () => {
    expect(
      resolveEnableElectrodes({
        featureEnabled: true,
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(false);
  });

  it('enables pair/small and large circuits when the flag is on', () => {
    expect(
      resolveEnableElectrodes({
        featureEnabled: true,
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(true);
    expect(
      resolveEnableElectrodes({
        featureEnabled: true,
        scale: CircuitScaleDictionary.SmallMicrocircuit,
      })
    ).toBe(true);
    expect(resolveEnableElectrodes({ featureEnabled: true, largeCircuit: true })).toBe(true);
  });
});
