import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  emodelValidationFlag,
  extracellularRecordingArrayBuildFlag,
  extractionActivityFlag,
} from '@/features/feature-flags/flags';
import {
  readWorkflowSessionSelection,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';

import {
  listLaunchActionsFromDataViewEntity,
  resolveSimulateSourceTypeFromDataView,
} from './routes';

const workspace = { virtualLabId: 'lab-1', projectId: 'project-1' };

describe('resolveSimulateSourceTypeFromDataView', () => {
  it('maps ME-models to the beta scan-config source type', () => {
    expect(resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Memodel, {})).toBe(
      ExtendedEntitiesTypeDict.MemodelCircuit
    );
  });

  it('maps circuits to a source type by scale', () => {
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.SmallMicrocircuit,
      })
    ).toBe(ExtendedEntitiesTypeDict.SmallMicrocircuit);
  });

  it('passes other source types through unchanged', () => {
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.SingleNeuronSynaptome, {})
    ).toBe(ExtendedEntitiesTypeDict.SingleNeuronSynaptome);
  });
});

const ionChannelModel = {
  id: 'ion-channel-id',
  nmodl_suffix: 'HCN3_0063',
  conductance_name: 'gIhbar',
  max_permeability_name: null,
  neuron_block: { global: [], range: [], useion: [], nonspecific: [{ ihcn: 'mA/cm2' }] },
};

function launch(
  extendedType: Parameters<typeof listLaunchActionsFromDataViewEntity>[0]['extendedType'],
  entity: object = {},
  flags?: Parameters<typeof listLaunchActionsFromDataViewEntity>[0]['flags']
) {
  return listLaunchActionsFromDataViewEntity({
    workspace,
    extendedType,
    entityId: 'entity-id',
    entity,
    flags,
  });
}

function labels(...args: Parameters<typeof launch>) {
  return launch(...args).map((action) => action.label);
}

describe('listLaunchActionsFromDataViewEntity', () => {
  it('lists the workflows an ME-model is an input to, Simulate first', () => {
    expect(labels(ExtendedEntitiesTypeDict.Memodel)).toEqual(['Simulate', 'Build synaptome']);
  });

  it('sends ME-model Simulate to the beta simulation configure route with the model pre-selected', () => {
    const [simulate] = launch(ExtendedEntitiesTypeDict.Memodel, {}, undefined);

    const match = simulate.href.match(
      /\/workflows\/simulate\/configure\/me-model-circuit-simulation\/(wf_[a-z0-9]{10})\?/
    );
    expect(match).not.toBeNull();

    expect(readWorkflowSessionSelection(match?.[1] as string)).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: { type: ExtendedEntitiesTypeDict.MemodelCircuit, id: 'entity-id' },
    });
  });

  it('lists Simulate for ion channel models and stores what the workflow seed derives', () => {
    const actions = launch(ExtendedEntitiesTypeDict.IonChannelModel, ionChannelModel);

    expect(actions.map((action) => action.label)).toEqual(['Simulate']);

    const match = actions[0].href.match(
      /\/workflows\/simulate\/configure\/ion-channel-model-simulation\/(wf_[a-z0-9]{10})\?/
    );
    expect(match).not.toBeNull();

    expect(readWorkflowSessionSelection(match?.[1] as string)).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: {
        type: ExtendedEntitiesTypeDict.IonChannelModel,
        id: 'entity-id',
        attributes: { conductance_name: 'gIhbar', max_permeability_name: null },
        properties: [
          {
            property: 'RecordableVariables',
            values: [{ ion_channel_id: 'ion-channel-id', variable_name: 'ihcn_HCN3_0063' }],
          },
        ],
      },
    });
  });

  it('lists Simulate for single-neuron synaptomes', () => {
    expect(labels(ExtendedEntitiesTypeDict.SingleNeuronSynaptome)).toEqual(['Simulate']);
  });

  it('lists Build ME-model for e-models, never optimization, and Validate only with its flag', () => {
    expect(labels(ExtendedEntitiesTypeDict.Emodel)).toEqual(['Build ME-model']);
    expect(
      labels(ExtendedEntitiesTypeDict.Emodel, {}, { [emodelValidationFlag.key]: true } as never)
    ).toEqual(['Build ME-model', 'Validate']);
  });

  it('pre-selects the e-model in the build and validate workflows', () => {
    const actions = launch(ExtendedEntitiesTypeDict.Emodel, {}, {
      [emodelValidationFlag.key]: true,
    } as never);

    for (const action of actions) {
      const sessionId = action.href.match(/\/(wf_[a-z0-9]{10})/)?.[1] as string;
      expect(readWorkflowSessionSelection(sessionId)).toEqual({
        mode: WorkflowSessionSelectionMode.Single,
        item: { type: ExtendedEntitiesTypeDict.Emodel, id: 'entity-id' },
      });
    }
  });

  it('lists no workflows for synthesized morphologies', () => {
    expect(labels(ExtendedEntitiesTypeDict.SynthesizedCellMorphology)).toEqual([]);
  });

  const flagsOn = {
    [extractionActivityFlag.key]: true,
    [extracellularRecordingArrayBuildFlag.key]: true,
  } as never;
  const all = ['Simulate', 'Recording array', 'Synapse physiology', 'Extract'];
  it.each([
    [ExtendedEntitiesTypeDict.Circuit, CircuitScaleDictionary.Microcircuit, all.toSpliced(2, 1)],
    [
      ExtendedEntitiesTypeDict.Microcircuit,
      CircuitScaleDictionary.Microcircuit,
      all.toSpliced(2, 1),
    ],
    [ExtendedEntitiesTypeDict.SmallMicrocircuit, CircuitScaleDictionary.SmallMicrocircuit, all],
    [ExtendedEntitiesTypeDict.PairedNeuronCircuit, CircuitScaleDictionary.PairNeuron, all],
    [
      ExtendedEntitiesTypeDict.WholeBrain,
      CircuitScaleDictionary.WholeBrain,
      ['Simulate', 'Extract'],
    ],
    [ExtendedEntitiesTypeDict.SingleNeuronCircuit, CircuitScaleDictionary.Single, all],
  ])('lists the circuit workflows for %s (%s) with their flags on', (type, scale, expected) => {
    expect(
      labels(type, { scale, number_neurons: 1000, has_electrical_cell_models: true }, flagsOn)
    ).toEqual(expected);
  });

  it('hides flagged circuit workflows while their flags are off', () => {
    expect(
      labels(
        ExtendedEntitiesTypeDict.SmallMicrocircuit,
        {
          scale: CircuitScaleDictionary.SmallMicrocircuit,
          number_neurons: 1000,
          has_electrical_cell_models: true,
        },
        {} as never
      )
    ).toEqual(['Simulate', 'Synapse physiology']);
  });

  it('omits the recording array for circuits over its neuron limit', () => {
    expect(
      labels(
        ExtendedEntitiesTypeDict.Microcircuit,
        {
          scale: CircuitScaleDictionary.Microcircuit,
          number_neurons: 500_000,
          has_electrical_cell_models: true,
        },
        flagsOn
      )
    ).not.toContain('Recording array');
  });

  it('picks the simulate workflow of a base circuit by scale', () => {
    const [simulate] = launch(ExtendedEntitiesTypeDict.Circuit, {
      scale: CircuitScaleDictionary.SmallMicrocircuit,
      has_electrical_cell_models: true,
    });

    expect(simulate.workflow.targetType).toBe(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation);
  });

  it('omits Simulate for circuits that cannot be simulated', () => {
    expect(
      labels(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.Microcircuit,
        has_electrical_cell_models: false,
      })
    ).not.toContain('Simulate');
  });
});
