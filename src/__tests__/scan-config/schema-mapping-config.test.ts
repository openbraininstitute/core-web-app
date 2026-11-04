import { describe, expect, it } from 'vitest';

import {
  mappedPropertiesPath,
  parseSchemaMappingConfiguration,
} from '@/features/scan-config/components/hooks/schema';
import { valuesOutsideOptions } from '@/features/scan-config/components/ui-elements/entity-property-multi-select';

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

describe('mappedPropertiesPath', () => {
  it.each([
    ['/mapped-circuit-properties/{circuit_id}', '/declared/mapped-circuit-properties/id'],
    [
      '/mapped-extracellular-recording-properties/{recording_id}',
      '/declared/mapped-extracellular-recording-properties/id',
    ],
  ])('puts the entity in %s', (endpoint, path) => {
    expect(mappedPropertiesPath(endpoint, 'id')).toBe(path);
  });
});

describe('valuesOutsideOptions', () => {
  const options = [{ value: 'Raw/AP0', label: 'AP0' }];

  it('names what the entity does not have', () => {
    expect(valuesOutsideOptions(['Raw/AP0', 'Raw/AP9'], options)).toEqual(['Raw/AP9']);
  });

  it('says nothing before the options have arrived', () => {
    expect(valuesOutsideOptions(['Raw/AP9'], [])).toEqual([]);
  });
});

describe('parseSchemaMappingConfiguration', () => {
  it('accepts a recording that gives only its channels', () => {
    const channels = [{ value: 'Raw/AP0', label: 'AP0' }];
    const parsed = parseSchemaMappingConfiguration({ Channels: channels, usability: {} });

    expect(parsed.Channels).toEqual(channels);
  });

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
