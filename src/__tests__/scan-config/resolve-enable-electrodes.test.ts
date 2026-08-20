import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  resolveEnableCellHover,
  resolveEnableElectrodes,
  resolveEnableMorphologyLocations,
} from '@/features/scan-config/components/model-preview/resolve-enable-electrodes';

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

  it('allows singles when the host opts in (ERA build)', () => {
    expect(
      resolveEnableElectrodes({
        featureEnabled: true,
        scale: CircuitScaleDictionary.Single,
        allowSingleScale: true,
      })
    ).toBe(true);
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

describe('resolveEnableCellHover', () => {
  it('turns hover off for single-scale circuits', () => {
    expect(resolveEnableCellHover({ scale: CircuitScaleDictionary.Single })).toBe(false);
  });

  it('keeps hover on for every other scale', () => {
    expect(resolveEnableCellHover({ scale: CircuitScaleDictionary.PairNeuron })).toBe(true);
    expect(resolveEnableCellHover({ scale: CircuitScaleDictionary.SmallMicrocircuit })).toBe(true);
    expect(resolveEnableCellHover({})).toBe(true);
  });

  it('never re-enables hover that domain policy switched off', () => {
    expect(
      resolveEnableCellHover({
        domainCellHover: false,
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(false);
  });
});

describe('resolveEnableMorphologyLocations', () => {
  it('takes explicit locations on one neuron', () => {
    // The single cell, and the synaptome — a single-scale circuit holding one neuron.
    expect(resolveEnableMorphologyLocations({ type: EntityTypeDict.Memodel })).toBe(true);
    expect(
      resolveEnableMorphologyLocations({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(true);
  });

  it('does not on a circuit that generates its locations', () => {
    for (const scale of [
      CircuitScaleDictionary.PairNeuron,
      CircuitScaleDictionary.SmallMicrocircuit,
      CircuitScaleDictionary.Microcircuit,
      CircuitScaleDictionary.Region,
    ]) {
      expect(resolveEnableMorphologyLocations({ type: EntityTypeDict.Circuit, scale })).toBe(false);
    }
  });

  it('does not on anything else the preview accepts', () => {
    expect(resolveEnableMorphologyLocations({ type: EntityTypeDict.IonChannelModel })).toBe(false);
    expect(resolveEnableMorphologyLocations({})).toBe(false);
  });
});
