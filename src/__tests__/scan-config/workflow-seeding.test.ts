import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useEntries } from '@/features/scan-config/components/hooks';
import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import { useConfig } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigFromIdType } from '@/features/scan-config/workflow/scan-config-from-id-type';
import { WorkflowSeed } from '@/features/scan-config/workflow/seeding/workflow-seed';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';

import type { Config, ConfigSchema } from '@/features/scan-config/types';
import type { TWorkflowSessionSelectionRef } from '@/features/scan-config/workflow/workflow-session-selection';

const ION_CHANNEL_ID = '0198f7f5-3bd0-7a2a-9c6f-1f6f2b1c9a11';

/** the ion channel model picker, as ObiOne emits it on each of the three variants */
function ionChannelModelField(filters: Record<string, unknown>) {
  return {
    properties: {
      id_str: {
        type: 'string',
        title: 'Id Str',
        description: 'ID of the entity in string format.',
      },
      type: {
        type: 'string',
        const: ScanConfigFromIdType.IonChannelModelFromID,
        title: 'Type',
        default: ScanConfigFromIdType.IonChannelModelFromID,
      },
    },
    title: 'Ion channel model',
    description: 'ID of the model to simulate.',
    entity_query: { filters, type: 'ion_channel_model' },
    ui_element: 'model_selector_single',
  };
}

/** trimmed copy of `IonChannelModelSimulationScanConfig` (obi-one), keeping the seeded blocks */
const ionChannelSimulationSchema = {
  title: 'IonChannelModelSimulationScanConfig',
  properties: {
    type: { const: 'IonChannelModelSimulationScanConfig', default: '' },
    initialize: {
      ui_element: 'block_single',
      title: 'Initialization',
      properties: {
        type: { const: 'IonChannelModelSimulationScanConfig.Initialize', default: '' },
        simulation_length: { ui_element: 'float_parameter_sweep', default: 1000, title: '' },
      },
    },
    ion_channel_models: {
      ui_element: 'block_dictionary',
      singular_name: 'ion channel model',
      title: 'Ion Channel Models',
      additionalProperties: {
        oneOf: [
          {
            title: 'Ion channel model with conductance',
            properties: {
              type: {
                const: 'IonChannelModelWithConductance',
                default: 'IonChannelModelWithConductance',
              },
              ion_channel_model: ionChannelModelField({ conductance_name__isnull: false }),
              conductance: { ui_element: 'float_parameter_sweep', title: 'Conductance value' },
            },
          },
          {
            title: 'Ion channel model with maximum permeability',
            properties: {
              type: {
                const: 'IonChannelModelWithMaxPermeability',
                default: 'IonChannelModelWithMaxPermeability',
              },
              ion_channel_model: ionChannelModelField({ max_permeability_name__isnull: false }),
              max_permeability: { ui_element: 'float_parameter_sweep', title: 'Max permeability' },
            },
          },
          {
            title: 'Ion channel model without conductance nor max permeability',
            properties: {
              type: {
                const: 'IonChannelModelWithoutConductance',
                default: 'IonChannelModelWithoutConductance',
              },
              ion_channel_model: ionChannelModelField({
                conductance_name__isnull: true,
                max_permeability_name__isnull: true,
              }),
            },
          },
        ],
      },
    },
    recordings: {
      ui_element: 'block_dictionary',
      singular_name: 'recording',
      title: 'Recordings',
      additionalProperties: {
        oneOf: [
          {
            title: 'Soma Voltage Recording',
            properties: {
              type: { const: 'SomaVoltageRecording', default: 'SomaVoltageRecording' },
              neuron_set: { ui_element: 'reference', default: null, title: 'Neuron Set' },
            },
          },
          {
            title: 'Ion Channel Variable Recording (Full Experiment)',
            properties: {
              type: {
                const: 'IonChannelVariableRecording',
                default: 'IonChannelVariableRecording',
              },
              neuron_set: { ui_element: 'reference', default: null, title: 'Neuron Set' },
              dt: { ui_element: 'float_parameter_sweep', default: 0.1, title: 'Timestep' },
              variable: {
                ui_element: 'select_recordable_ion_channel_variable',
                property: 'RecordableVariables',
                property_group: 'ion_channel_model',
                title: 'Ion Channel Variable Name',
                properties: {
                  type: {
                    const: 'IonChannelVariableForRecording',
                    default: 'IonChannelVariableForRecording',
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
} as unknown as ConfigSchema;

/** ME-model shape: the entity goes under `initialize`, not into a dictionary */
const initializeModelSchema = {
  title: 'MEModelSimulationScanConfig',
  properties: {
    type: { const: 'MEModelSimulationScanConfig', default: '' },
    initialize: {
      ui_element: 'block_single',
      title: 'Initialization',
      properties: {
        type: { const: 'MEModelSimulationScanConfig.Initialize', default: '' },
        circuit: { ui_element: 'model_identifier', title: 'Circuit' },
      },
    },
  },
} as unknown as ConfigSchema;

const emptyIonChannelConfig: Config = {
  type: 'IonChannelModelSimulationScanConfig',
  initialize: { type: 'IonChannelModelSimulationScanConfig.Initialize', simulation_length: 1000 },
  ion_channel_models: {},
  recordings: {},
};

function singleSelection(item: TWorkflowSessionSelectionRef) {
  return { mode: WorkflowSessionSelectionMode.Single, item } as const;
}

const resolveIonChannelFromIdType = () => ScanConfigFromIdType.IonChannelModelFromID as string;

/** the generic policy: workflows only subclass it when the schema shapes are not enough */
const workflowSeed = new WorkflowSeed();

describe('WorkflowSeed.resolveEntityTarget', () => {
  it.each([
    [{ conductance_name: 'gIhbar', max_permeability_name: null }, 'IonChannelModelWithConductance'],
    [
      { conductance_name: null, max_permeability_name: 'pcabar' },
      'IonChannelModelWithMaxPermeability',
    ],
    [{ conductance_name: null, max_permeability_name: null }, 'IonChannelModelWithoutConductance'],
  ])('picks the variant whose entity_query the model satisfies (%o)', (attributes, expected) => {
    const target = workflowSeed.resolveEntityTarget({
      schema: ionChannelSimulationSchema,
      fromIdType: ScanConfigFromIdType.IonChannelModelFromID,
      attributes,
    });

    expect(target?.rootKey).toBe('ion_channel_models');
    expect(target?.fieldKey).toBe('ion_channel_model');
    expect(target?.variant.properties.type.const).toBe(expected);
  });

  it('seeds nothing when the variant cannot be decided', () => {
    expect(
      workflowSeed.resolveEntityTarget({
        schema: ionChannelSimulationSchema,
        fromIdType: ScanConfigFromIdType.IonChannelModelFromID,
      })
    ).toBeNull();
  });

  it('ignores blocks that accept a different entity type', () => {
    expect(
      workflowSeed.resolveEntityTarget({
        schema: ionChannelSimulationSchema,
        fromIdType: ScanConfigFromIdType.MEModelFromID,
        attributes: { conductance_name: 'gIhbar' },
      })
    ).toBeNull();
  });
});

describe('WorkflowSeed.applyTo', () => {
  it('seeds the model block and one recording per variable', () => {
    const patched = workflowSeed.applyTo({
      config: emptyIonChannelConfig,
      schema: ionChannelSimulationSchema,
      sessionSelection: singleSelection({
        type: ExtendedEntitiesTypeDict.IonChannelModel,
        id: ION_CHANNEL_ID,
        attributes: { conductance_name: 'gIhbar', max_permeability_name: null },
        properties: [
          {
            property: 'RecordableVariables',
            values: [
              { ion_channel_id: ION_CHANNEL_ID, variable_name: 'ihcn_HCN3_0063' },
              { ion_channel_id: ION_CHANNEL_ID, variable_name: 'ik_HCN3_0063' },
            ],
          },
        ],
      }),
      resolveFromIdType: resolveIonChannelFromIdType,
    });

    expect(patched.ion_channel_models).toEqual({
      'Ion channel model 0': {
        type: 'IonChannelModelWithConductance',
        ion_channel_model: {
          type: ScanConfigFromIdType.IonChannelModelFromID,
          id_str: ION_CHANNEL_ID,
        },
        // required by ObiOne but has no schema default: the user still fills it in
        conductance: null,
      },
    });

    expect(patched.recordings).toEqual({
      'Recording 0': {
        type: 'IonChannelVariableRecording',
        neuron_set: null,
        dt: 0.1,
        variable: {
          type: 'IonChannelVariableForRecording',
          ion_channel_id: ION_CHANNEL_ID,
          variable_name: 'ihcn_HCN3_0063',
        },
      },
      'Recording 1': {
        type: 'IonChannelVariableRecording',
        neuron_set: null,
        dt: 0.1,
        variable: {
          type: 'IonChannelVariableForRecording',
          ion_channel_id: ION_CHANNEL_ID,
          variable_name: 'ik_HCN3_0063',
        },
      },
    });
  });

  it('numbers seeded entries after the ones already in the config', () => {
    const patched = workflowSeed.applyTo({
      config: {
        ...emptyIonChannelConfig,
        recordings: { 'Recording 0': { type: 'SomaVoltageRecording', neuron_set: null } },
      },
      schema: ionChannelSimulationSchema,
      sessionSelection: singleSelection({
        type: ExtendedEntitiesTypeDict.IonChannelModel,
        id: ION_CHANNEL_ID,
        attributes: { conductance_name: null, max_permeability_name: null },
        properties: [
          {
            property: 'RecordableVariables',
            values: [{ ion_channel_id: ION_CHANNEL_ID, variable_name: 'ihcn_HCN3_0063' }],
          },
        ],
      }),
      resolveFromIdType: resolveIonChannelFromIdType,
    });

    expect(Object.keys(patched.recordings as object)).toEqual(['Recording 0', 'Recording 1']);
  });

  it('leaves the config untouched when no block accepts the entity', () => {
    const config = emptyIonChannelConfig;
    const patched = workflowSeed.applyTo({
      config,
      schema: ionChannelSimulationSchema,
      sessionSelection: singleSelection({
        type: ExtendedEntitiesTypeDict.Memodel,
        id: ION_CHANNEL_ID,
      }),
      resolveFromIdType: () => ScanConfigFromIdType.MEModelFromID,
    });

    expect(patched).toBe(config);
  });

  it('still writes the initialize model field for schemas that declare one', () => {
    const patched = workflowSeed.applyTo({
      config: { type: 'MEModelSimulationScanConfig', initialize: { circuit: null } },
      schema: initializeModelSchema,
      sessionSelection: singleSelection({
        type: ExtendedEntitiesTypeDict.MemodelCircuit,
        id: ION_CHANNEL_ID,
      }),
      resolveFromIdType: () => ScanConfigFromIdType.MEModelFromID,
    });

    expect(patched.initialize).toEqual({
      circuit: { type: ScanConfigFromIdType.MEModelFromID, id_str: ION_CHANNEL_ID },
    });
  });
});

describe('editor state built from a seeded session', () => {
  const seededSelection = singleSelection({
    type: ExtendedEntitiesTypeDict.IonChannelModel,
    id: ION_CHANNEL_ID,
    attributes: { conductance_name: 'gIhbar', max_permeability_name: null },
    properties: [
      {
        property: 'RecordableVariables',
        values: [{ ion_channel_id: ION_CHANNEL_ID, variable_name: 'ihcn_HCN3_0063' }],
      },
    ],
  });

  it('opens the editor with the model and its recording already configured', () => {
    const { result } = renderHook(() =>
      useConfig({
        schema: ionChannelSimulationSchema,
        model: null,
        workflowSessionSelection: seededSelection,
        resolveFromIdType: resolveIonChannelFromIdType,
      })
    );

    const [config] = result.current;

    expect(config.ion_channel_models).toHaveProperty('Ion channel model 0');
    expect(config.recordings).toHaveProperty(['Recording 0', 'variable'], {
      type: 'IonChannelVariableForRecording',
      ion_channel_id: ION_CHANNEL_ID,
      variable_name: 'ihcn_HCN3_0063',
    });
  });

  it('reserves the seeded entry names, so the next block the user adds does not overwrite one', () => {
    const { result } = renderHook(() => {
      const [config] = useConfig({
        schema: ionChannelSimulationSchema,
        model: null,
        workflowSessionSelection: seededSelection,
        resolveFromIdType: resolveIonChannelFromIdType,
      });
      return useEntries({ config, schema: ionChannelSimulationSchema });
    });

    expect(result.current).toEqual(new Set(['Ion channel model 0', 'Recording 0']));
    expect(nextEntryName(ionChannelSimulationSchema, 'recordings', result.current)).toBe(
      'Recording 1'
    );
  });

  it('still reserves the entry names of a resumed campaign, which arrive via initialConfig', () => {
    const initialConfig: Config = {
      ...emptyIonChannelConfig,
      ion_channel_models: {
        'Ion channel model 0': { type: 'IonChannelModelWithConductance', conductance: 0.2 },
      },
      recordings: {
        'Recording 0': { type: 'SomaVoltageRecording', neuron_set: null },
        'Recording 1': { type: 'SomaVoltageRecording', neuron_set: null },
      },
    };

    const { result } = renderHook(() => {
      const [config] = useConfig({
        schema: ionChannelSimulationSchema,
        initialConfig,
        model: null,
        origin: 'campaign-id',
      });
      return useEntries({ config, schema: ionChannelSimulationSchema });
    });

    expect(result.current).toEqual(new Set(['Ion channel model 0', 'Recording 0', 'Recording 1']));
    expect(nextEntryName(ionChannelSimulationSchema, 'recordings', result.current)).toBe(
      'Recording 2'
    );
  });

  it('keeps a resumed campaign form as it was saved', () => {
    const initialConfig: Config = {
      ...emptyIonChannelConfig,
      recordings: { 'Recording 0': { type: 'SomaVoltageRecording', neuron_set: null } },
    };

    const { result } = renderHook(() =>
      useConfig({
        schema: ionChannelSimulationSchema,
        initialConfig,
        model: null,
        origin: 'campaign-id',
        workflowSessionSelection: seededSelection,
        resolveFromIdType: resolveIonChannelFromIdType,
      })
    );

    const [config] = result.current;

    expect(config.ion_channel_models).toEqual({});
    expect(config.recordings).toEqual(initialConfig.recordings);
  });
});
