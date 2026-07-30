import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  readWorkflowSessionSelection,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';

import {
  buildSimulateConfigureUrlFromDataViewEntity,
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
});
