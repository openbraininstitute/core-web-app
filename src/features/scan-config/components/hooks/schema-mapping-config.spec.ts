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
    expect(parsed.MechanismVariablesByIonChannel).toBeUndefined();
  });

  it('accepts MEModel mapped-circuit-properties with MechanismVariablesByIonChannel only', () => {
    const parsed = parseSchemaMappingConfiguration({
      MechanismVariablesByIonChannel: {
        NaTg: {
          section_lists: ['somatic', 'axonal'],
          entity_id: '13c947c3-cb76-4a9a-91f4-146e95bd25f3',
          variables: {
            gNaTgbar_NaTg: {
              units: '',
              limits: [0, 10],
              variable_type: 'RANGE',
              section_lists_original_values: {
                somatic: 0.21,
                axonal: 0.42,
              },
            },
          },
        },
      },
      usability: defaultUsability,
    });

    expect(parsed.MechanismVariablesByIonChannel?.NaTg).toBeDefined();
    expect(parsed.NodePropertyUniqueValuesByPopulation).toBeUndefined();
  });

  it('accepts responses that include both circuit and memodel property groups', () => {
    const parsed = parseSchemaMappingConfiguration({
      NodePropertyUniqueValuesByPopulation: {
        L5: { mtype: ['L5_PC'] },
      },
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
