import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { nextStepsFor, workflowTypeOf } from './next-steps';

describe('workflowTypeOf', () => {
  it('knows a circuit by its scale, anything else by its type', () => {
    expect(workflowTypeOf({ type: EntityTypeDict.Circuit, scale: 'small' })).toBe(
      ExtendedEntitiesTypeDict.SmallMicrocircuit
    );
    expect(workflowTypeOf({ type: EntityTypeDict.Circuit, scale: 'pair' })).toBe(
      ExtendedEntitiesTypeDict.PairedNeuronCircuit
    );
    expect(workflowTypeOf({ type: EntityTypeDict.Memodel })).toBe(ExtendedEntitiesTypeDict.Memodel);
    expect(workflowTypeOf({ type: null })).toBeUndefined();
  });
});

describe('nextStepsFor', () => {
  it('offers the workflows whose configuration takes the type, legacy ones last', () => {
    const steps = nextStepsFor(ExtendedEntitiesTypeDict.Memodel);
    const targets = steps.map((s) => s.targetType);
    expect(targets).toContain(ExtendedEntitiesTypeDict.BuildSynaptomeCampaign);
    const firstLegacy = steps.findIndex((s) => s.legacy);
    if (firstLegacy >= 0) expect(steps.slice(firstLegacy).every((s) => s.legacy)).toBe(true);
  });

  it('offers a small microcircuit its simulation', () => {
    expect(
      nextStepsFor(ExtendedEntitiesTypeDict.SmallMicrocircuit).map((s) => s.targetType)
    ).toContain(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation);
  });

  it('offers nothing for no type', () => {
    expect(nextStepsFor(undefined)).toEqual([]);
  });
});
