import { describe, expect, it, vi } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  readWorkflowSessionSelection,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';
import {
  buildBuildConfigureUrlFromDataViewEntity,
  buildSimulateConfigureUrlFromDataViewEntity,
  findBuildWorkflowForEntity,
  resolveSimulateSourceTypeFromDataView,
} from '@/ui/segments/workflows/config/routes';

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

describe('buildSimulateConfigureUrlFromDataViewEntity', () => {
  it('sends ME-models to the beta simulation configure route with the model pre-selected', () => {
    const href = buildSimulateConfigureUrlFromDataViewEntity({
      workspace,
      extendedType: ExtendedEntitiesTypeDict.Memodel,
      entityId: 'me-model-id',
      entity: {},
    });

    const match = href?.match(
      /\/workflows\/simulate\/configure\/me-model-circuit-simulation\/(wf_[a-z0-9]{10})\?/
    );
    expect(match).not.toBeNull();

    expect(readWorkflowSessionSelection(match?.[1] as string)).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: { type: ExtendedEntitiesTypeDict.MemodelCircuit, id: 'me-model-id' },
    });
  });

  it("stores what the workflow's seed derives from the ion channel model", () => {
    const href = buildSimulateConfigureUrlFromDataViewEntity({
      workspace,
      extendedType: ExtendedEntitiesTypeDict.IonChannelModel,
      entityId: 'ion-channel-id',
      entity: {
        id: 'ion-channel-id',
        nmodl_suffix: 'HCN3_0063',
        conductance_name: 'gIhbar',
        max_permeability_name: null,
        neuron_block: { global: [], range: [], useion: [], nonspecific: [{ ihcn: 'mA/cm2' }] },
      },
    });

    const match = href?.match(
      /\/workflows\/simulate\/configure\/ion-channel-model-simulation\/(wf_[a-z0-9]{10})\?/
    );
    expect(match).not.toBeNull();

    expect(readWorkflowSessionSelection(match?.[1] as string)).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: {
        type: ExtendedEntitiesTypeDict.IonChannelModel,
        id: 'ion-channel-id',
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
});

describe('buildBuildConfigureUrlFromDataViewEntity', () => {
  it('opens the ion channel build editor with the recording pre-selected', () => {
    const href = buildBuildConfigureUrlFromDataViewEntity({
      workspace,
      extendedType: ExtendedEntitiesTypeDict.IonChannelRecording,
      entityId: 'recording-id',
    });

    const match = href?.match(
      /\/workflows\/build\/configure\/ion-channel-build-campaign\/(wf_[a-z0-9]{10})$/
    );
    expect(match).not.toBeNull();

    expect(readWorkflowSessionSelection(match?.[1] as string)).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: { type: ExtendedEntitiesTypeDict.IonChannelRecording, id: 'recording-id' },
    });
  });

  it('returns null for a type with no build workflow', () => {
    expect(
      buildBuildConfigureUrlFromDataViewEntity({
        workspace,
        extendedType: ExtendedEntitiesTypeDict.CellMorphology,
        entityId: 'morphology-id',
      })
    ).toBeNull();
  });
});

describe('findBuildWorkflowForEntity', () => {
  it('finds the build workflow of a buildable type without writing a selection', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expect(
      findBuildWorkflowForEntity(ExtendedEntitiesTypeDict.IonChannelRecording)?.targetType
    ).toBe(ExtendedEntitiesTypeDict.IonChannelBuildCampaign);
    expect(findBuildWorkflowForEntity(ExtendedEntitiesTypeDict.CellMorphology)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });
});
