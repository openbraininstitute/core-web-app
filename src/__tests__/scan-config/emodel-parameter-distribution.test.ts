import { describe, expect, it } from 'vitest';

import {
  availableDistributions,
  defaultOptimizationValue,
  entryParameters,
  makeParameterSelection,
  readDistribution,
  readMechanisms,
  readRegionEntries,
  remapParameterDistributions,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const emodelSchema = {
  properties: {
    emodel_optimisation_parameters: { ui_element: 'emodel_optimisation_parameters' },
  },
} as unknown as ConfigSchema;

/** A config with two params: one using the given distribution, one using an unrelated `other_decay`. */
function configWithDistribution(distribution: string): Config {
  return {
    emodel_optimisation_parameters: {
      mechanisms: {
        mechanism_regions: {
          somatic: [
            {
              type: 'MechanismRegionSelection',
              ion_channel_model: { type: 'IonChannelModelFromID', id_str: 'icm-1' },
              parameters: {
                gNa: { type: 'ParameterSelection', value: {}, distribution },
                gK: { type: 'ParameterSelection', value: {}, distribution: 'other_decay' },
              },
            },
          ],
        },
      },
    },
  };
}

describe('availableDistributions', () => {
  it('returns no distributions when none are declared', () => {
    const config: Config = { emodel_optimisation_parameters: {} };
    expect(availableDistributions(config)).toEqual([]);
  });

  it('returns the declared custom distributions with their name and python function', () => {
    const config: Config = {
      distance_dependent_distributions: {
        mouse_decay: {
          type: 'CustomDistanceDependentDistribution',
          function: 'math.exp({distance})*{value}',
        },
        rat_decay: { type: 'CustomDistanceDependentDistribution', function: '{value}' },
      },
    };
    expect(availableDistributions(config)).toEqual([
      { name: 'mouse_decay', function: 'math.exp({distance})*{value}' },
      { name: 'rat_decay', function: '{value}' },
    ]);
  });

  it('uses an empty function when the entry has none', () => {
    const config: Config = {
      distance_dependent_distributions: {
        mouse_decay: { type: 'CustomDistanceDependentDistribution' },
      },
    };
    expect(availableDistributions(config)).toEqual([{ name: 'mouse_decay', function: '' }]);
  });
});

describe('readDistribution', () => {
  it('reads a stored distribution', () => {
    expect(readDistribution({ distribution: 'mouse_decay' })).toBe('mouse_decay');
  });

  it('returns null when missing or empty (the nullable default)', () => {
    expect(readDistribution({})).toBeNull();
    expect(readDistribution({ distribution: '' })).toBeNull();
    expect(readDistribution(null)).toBeNull();
  });
});

describe('makeParameterSelection', () => {
  it('omits the distribution key for a new parameter (schema is non-nullable with a default)', () => {
    const selection = makeParameterSelection(defaultOptimizationValue());
    expect(selection).not.toHaveProperty('distribution');
  });

  it('preserves an explicitly passed distribution', () => {
    const selection = makeParameterSelection(defaultOptimizationValue(), 'mouse_decay');
    expect(selection).toMatchObject({ distribution: 'mouse_decay' });
  });
});

describe('remapParameterDistributions', () => {
  const distributionOf = (config: Config, paramName: string) => {
    const entry = readRegionEntries(
      readMechanisms(config.emodel_optimisation_parameters),
      'somatic'
    )[0];
    return readDistribution(entryParameters(entry)[paramName]);
  };

  it('renames every parameter using the old distribution name', () => {
    const next = remapParameterDistributions(
      configWithDistribution('mouse_decay'),
      emodelSchema,
      'mouse_decay',
      'rat_decay'
    );
    expect(distributionOf(next, 'gNa')).toBe('rat_decay');
    // Unrelated params are untouched.
    expect(distributionOf(next, 'gK')).toBe('other_decay');
  });

  it('drops the distribution key when the distribution is deleted', () => {
    const next = remapParameterDistributions(
      configWithDistribution('mouse_decay'),
      emodelSchema,
      'mouse_decay',
      null
    );
    const entry = readRegionEntries(
      readMechanisms(next.emodel_optimisation_parameters),
      'somatic'
    )[0];
    // The key is removed, not set to null (the schema's `distribution` is a non-nullable string).
    expect(entryParameters(entry).gNa).not.toHaveProperty('distribution');
    expect(distributionOf(next, 'gNa')).toBeNull();
    expect(distributionOf(next, 'gK')).toBe('other_decay');
  });

  it('returns the same config when no parameter uses the name', () => {
    const config = configWithDistribution('other_decay');
    expect(remapParameterDistributions(config, emodelSchema, 'mouse_decay', null)).toBe(config);
  });
});
