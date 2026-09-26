import { describe, expect, it } from 'vitest';

import {
  availableDistributions,
  DEFAULT_DISTRIBUTION,
  defaultOptimizationValue,
  entryParameters,
  makeParameterSelection,
  readDistribution,
  readMechanisms,
  readRegionEntries,
  remapParameterDistributions,
  STANDARD_DISTRIBUTIONS,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const emodelSchema = {
  properties: {
    emodel_optimisation_parameters: { ui_element: 'emodel_optimisation_parameters' },
  },
} as unknown as ConfigSchema;

/** A config with two params: one using `mouse_decay`, one using `uniform`. */
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
                gK: { type: 'ParameterSelection', value: {}, distribution: 'uniform' },
              },
            },
          ],
        },
      },
    },
  };
}

describe('availableDistributions', () => {
  it('returns the ten built-ins when no custom distributions are declared', () => {
    const config: Config = { emodel_optimisation_parameters: {} };
    expect(availableDistributions(config)).toEqual([...STANDARD_DISTRIBUTIONS]);
  });

  it('merges user-declared custom distributions after the built-ins, de-duplicated', () => {
    const config: Config = {
      distance_dependent_distributions: {
        mouse_decay: { type: 'CustomDistanceDependentDistribution' },
        // A custom name colliding with a built-in must not appear twice.
        exp: { type: 'CustomDistanceDependentDistribution' },
      },
    };
    const result = availableDistributions(config);
    expect(result).toEqual([...STANDARD_DISTRIBUTIONS, 'mouse_decay']);
    expect(result.filter((d) => d === 'exp')).toHaveLength(1);
  });
});

describe('readDistribution', () => {
  it('reads a stored distribution', () => {
    expect(readDistribution({ distribution: 'mouse_decay' })).toBe('mouse_decay');
  });

  it('defaults to uniform when missing or empty', () => {
    expect(readDistribution({})).toBe(DEFAULT_DISTRIBUTION);
    expect(readDistribution({ distribution: '' })).toBe(DEFAULT_DISTRIBUTION);
    expect(readDistribution(null)).toBe(DEFAULT_DISTRIBUTION);
  });
});

describe('makeParameterSelection', () => {
  it('applies the uniform default to a new parameter', () => {
    const selection = makeParameterSelection(defaultOptimizationValue());
    expect(selection).toMatchObject({ distribution: DEFAULT_DISTRIBUTION });
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
    expect(distributionOf(next, 'gK')).toBe('uniform');
  });

  it('resets parameters to uniform when the distribution is deleted', () => {
    const next = remapParameterDistributions(
      configWithDistribution('mouse_decay'),
      emodelSchema,
      'mouse_decay',
      null
    );
    expect(distributionOf(next, 'gNa')).toBe(DEFAULT_DISTRIBUTION);
    expect(distributionOf(next, 'gK')).toBe('uniform');
  });

  it('returns the same config when no parameter uses the name', () => {
    const config = configWithDistribution('uniform');
    expect(remapParameterDistributions(config, emodelSchema, 'mouse_decay', null)).toBe(config);
  });
});
