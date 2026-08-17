import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveCampaignCircuitDataType } from '@/features/data-grid/bindings/entitycore/renderers/circuit-name-cell';

describe('resolveCampaignCircuitDataType', () => {
  it('routes ME-models to the memodel detail page', () => {
    expect(resolveCampaignCircuitDataType({ type: EntityTypeDict.Memodel })).toBe(
      ExtendedEntitiesTypeDict.Memodel
    );
  });

  it('keeps single-neuron circuits on their own page', () => {
    expect(
      resolveCampaignCircuitDataType({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(ExtendedEntitiesTypeDict.SingleNeuronCircuit);
  });

  it('folds other circuit scales into the generic circuit page', () => {
    expect(
      resolveCampaignCircuitDataType({
        type: EntityTypeDict.Circuit,
        scale: CircuitScaleDictionary.WholeBrain,
      })
    ).toBe(ExtendedEntitiesTypeDict.Circuit);
  });
});
