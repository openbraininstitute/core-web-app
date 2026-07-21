import { describe, expect, it } from 'vitest';

import { selectMechanismVariablesRoot } from '@/features/scan-config/components/hooks/use-neuronal-manipulation-properties';

const SAMPLE_CHANNEL = {
  section_lists: ['somatic'],
  entity_id: null,
  variables: {
    g_pas: {
      units: '',
      limits: [0, 10] as [number, number],
      variable_type: 'RANGE' as const,
      section_lists_original_values: { somatic: null },
    },
  },
};

describe('selectMechanismVariablesRoot', () => {
  it('reads PascalCase MechanismVariablesByIonChannel from the live API shape', () => {
    const root = selectMechanismVariablesRoot({
      entity_type: 'circuit',
      populations: null,
      MechanismVariablesByIonChannel: { pas: SAMPLE_CHANNEL },
      warnings: null,
    });

    expect(root).toEqual({ pas: SAMPLE_CHANNEL });
    expect(Object.keys(root)).toHaveLength(1);
  });

  it('falls back to legacy snake_case when PascalCase is absent', () => {
    const root = selectMechanismVariablesRoot({
      mechanism_variables_by_ion_channel: { pas: SAMPLE_CHANNEL },
    });

    expect(root).toEqual({ pas: SAMPLE_CHANNEL });
  });

  it('prefers PascalCase when both keys are present', () => {
    const root = selectMechanismVariablesRoot({
      MechanismVariablesByIonChannel: { pas: SAMPLE_CHANNEL },
      mechanism_variables_by_ion_channel: { other: SAMPLE_CHANNEL },
    });

    expect(root).toEqual({ pas: SAMPLE_CHANNEL });
  });

  it('returns an empty object when neither key is present', () => {
    expect(selectMechanismVariablesRoot({ entity_type: 'circuit' })).toEqual({});
  });
});
