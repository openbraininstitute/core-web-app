import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  resolveEnableCellHover,
  resolveEnableElectrodes,
  resolveExplicitLocationsBlockTypes,
  resolveSingleMorphology,
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

const EXPLICIT = 'ExplicitMorphologyLocations';
const PER_NEURON = 'PerNeuronExplicitMorphologyLocations';
const BOTH = [EXPLICIT, PER_NEURON];
const types = (model: Parameters<typeof resolveExplicitLocationsBlockTypes>[0], accepted = BOTH) =>
  resolveExplicitLocationsBlockTypes(model, accepted);

describe('resolveExplicitLocationsBlockTypes', () => {
  it('fills explicit blocks on an MEModel, which has no node ids', () => {
    expect(types({ type: EntityTypeDict.Memodel })).toEqual([EXPLICIT]);
  });

  it('fills either on one neuron, a new block plain', () => {
    expect(types({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single })).toEqual(
      BOTH
    );
  });

  it('fills only per-neuron blocks on a circuit drawing several neurons', () => {
    for (const scale of [
      CircuitScaleDictionary.PairNeuron,
      CircuitScaleDictionary.SmallMicrocircuit,
    ]) {
      expect(types({ type: EntityTypeDict.Circuit, scale })).toEqual([PER_NEURON]);
    }
  });

  it('never offers a block the workflow schema does not take', () => {
    expect(types({ type: EntityTypeDict.Memodel }, [PER_NEURON])).toEqual([]);
    expect(
      types({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.PairNeuron }, [EXPLICIT])
    ).toEqual([]);
    expect(
      types({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single }, [PER_NEURON])
    ).toEqual([PER_NEURON]);
  });

  it('fills nothing where morphologies are not drawn, or on other models', () => {
    for (const scale of [CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region]) {
      expect(types({ type: EntityTypeDict.Circuit, scale })).toEqual([]);
    }
    expect(types({ type: EntityTypeDict.IonChannelModel })).toEqual([]);
    expect(types({})).toEqual([]);
  });
});

describe('resolveSingleMorphology', () => {
  it('is true on one morphology only', () => {
    expect(resolveSingleMorphology({ type: EntityTypeDict.Memodel })).toBe(true);
    expect(
      resolveSingleMorphology({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(true);
    expect(
      resolveSingleMorphology({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(false);
    expect(resolveSingleMorphology({})).toBe(false);
  });
});
