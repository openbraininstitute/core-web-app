import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  resolveEnableCellHover,
  resolveEnableElectrodes,
  resolveExplicitLocationsBlockType,
  resolvePreviewsGeneratedLocations,
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

describe('resolveExplicitLocationsBlockType', () => {
  it('picks explicit locations on one neuron', () => {
    // The single cell, and the synaptome: a single-scale circuit holding one neuron.
    expect(resolveExplicitLocationsBlockType({ type: EntityTypeDict.Memodel }, [EXPLICIT])).toBe(
      EXPLICIT
    );
    expect(
      resolveExplicitLocationsBlockType(
        { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
        [EXPLICIT]
      )
    ).toBe(EXPLICIT);
  });

  it('picks per-neuron locations on a circuit drawing several neurons', () => {
    for (const scale of [
      CircuitScaleDictionary.PairNeuron,
      CircuitScaleDictionary.SmallMicrocircuit,
    ]) {
      expect(
        resolveExplicitLocationsBlockType({ type: EntityTypeDict.Circuit, scale }, [
          EXPLICIT,
          PER_NEURON,
        ])
      ).toBe(PER_NEURON);
    }
  });

  it('falls back to per-neuron on one neuron when the workflow takes only that', () => {
    expect(
      resolveExplicitLocationsBlockType(
        { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
        [PER_NEURON]
      )
    ).toBe(PER_NEURON);
  });

  it('never offers a block the workflow schema does not take', () => {
    // An MEModel has no node ids to fill a per-neuron row with.
    expect(resolveExplicitLocationsBlockType({ type: EntityTypeDict.Memodel }, [PER_NEURON])).toBe(
      null
    );
    // A bare section id means a different branch on every morphology of a pair.
    expect(
      resolveExplicitLocationsBlockType(
        { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.PairNeuron },
        [EXPLICIT]
      )
    ).toBe(null);
  });

  it('picks nothing where morphologies are not drawn, or on other models', () => {
    for (const scale of [CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region]) {
      expect(
        resolveExplicitLocationsBlockType({ type: EntityTypeDict.Circuit, scale }, [
          EXPLICIT,
          PER_NEURON,
        ])
      ).toBe(null);
    }
    expect(
      resolveExplicitLocationsBlockType({ type: EntityTypeDict.IonChannelModel }, [EXPLICIT])
    ).toBe(null);
    expect(resolveExplicitLocationsBlockType({}, [EXPLICIT])).toBe(null);
  });
});

describe('resolvePreviewsGeneratedLocations', () => {
  it('previews on one morphology only', () => {
    expect(resolvePreviewsGeneratedLocations({ type: EntityTypeDict.Memodel })).toBe(true);
    expect(
      resolvePreviewsGeneratedLocations({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(true);
    expect(
      resolvePreviewsGeneratedLocations({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(false);
    expect(resolvePreviewsGeneratedLocations({})).toBe(false);
  });
});
