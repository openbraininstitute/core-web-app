import { describe, expect, it } from 'vitest';

import { parseSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

const defaultUsability = {
  ShowElectricFieldStimuli: false,
  InputResistanceBasedStimuli: false,
  ShowBiophysicalNeuronSets: false,
  ShowPointNeuronSets: false,
  ShowVirtualNeuronSets: false,
  ShowNonVirtualNeuronSets: false,
  ShowNeuronSets: false,
  ShowDeprecatedBlocks: false,
} as const;

describe('parseSchemaMappingConfiguration', () => {
  it('accepts Circuit mapped-circuit-properties with NodePropertyUniqueValuesByPopulation', () => {
    const parsed = parseSchemaMappingConfiguration({
      NodeSet: ['AllNeurons'],
      BiophysicalNeuronalPopulation: ['L5'],
      NodePropertyUniqueValuesByPopulation: {
        L5: {
          mtype: ['L5_PC', 'L5_NBC'],
          layer: ['5'],
        },
      },
      usability: defaultUsability,
    });

    expect(parsed.NodePropertyUniqueValuesByPopulation?.L5.mtype).toEqual(['L5_PC', 'L5_NBC']);
  });

  it('accepts MEModel mapped-circuit-properties with usability only', () => {
    const parsed = parseSchemaMappingConfiguration({
      usability: defaultUsability,
    });

    expect(parsed.usability).toEqual(defaultUsability);
    expect(parsed.NodePropertyUniqueValuesByPopulation).toBeUndefined();
  });

  it('preserves unexpected keys via catchall without requiring MechanismVariablesByIonChannel', () => {
    const parsed = parseSchemaMappingConfiguration({
      NodePropertyUniqueValuesByPopulation: {
        L5: { mtype: ['L5_PC'] },
      },
      // Legacy leftover: mechanism variables are no longer part of mapped-circuit-properties;
      // neuronal manipulation uses dedicated POST endpoints instead.
      MechanismVariablesByIonChannel: {
        pas: {
          section_lists: ['somatic'],
          entity_id: null,
          variables: {},
        },
      },
      usability: defaultUsability,
    });

    expect(parsed.NodePropertyUniqueValuesByPopulation).toBeDefined();
    expect(parsed.MechanismVariablesByIonChannel).toBeDefined();
  });
});
