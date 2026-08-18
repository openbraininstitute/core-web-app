import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { getEntityFilesHandlerMap } from '@/features/entity-download/file-handlers';

describe('getEntityFilesHandlerMap', () => {
  it.each([
    EntityTypeDict.ElectricalCellRecording,
    EntityTypeDict.IonChannelRecording,
    EntityTypeDict.ExperimentalBoutonDensity,
    EntityTypeDict.ExperimentalNeuronDensity,
    EntityTypeDict.ExperimentalSynapsesPerConnection,
    EntityTypeDict.CellMorphology,
    EntityTypeDict.EMCellMesh,
    EntityTypeDict.TaskResult,
    EntityTypeDict.Emodel,
    EntityTypeDict.Memodel,
    EntityTypeDict.SingleNeuronSynaptome,
    EntityTypeDict.IonChannelModel,
    EntityTypeDict.AnalysisNotebookTemplate,
    EntityTypeDict.AnalysisNotebookResult,
    EntityTypeDict.Circuit,
    EntityTypeDict.SimulatableExtracellularRecordingArray,
    EntityTypeDict.SingleNeuronSimulation,
    EntityTypeDict.SingleNeuronSynaptomeSimulation,
    EntityTypeDict.SimulationCampaign,
  ] as const)('exposes a download handler for %s', (entityType) => {
    expect(typeof getEntityFilesHandlerMap[entityType]).toBe('function');
  });
});
