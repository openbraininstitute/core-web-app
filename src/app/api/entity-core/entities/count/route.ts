import { DEFAULT_BRAIN_REGION_HIERARCHY_ID } from '@/features/brain-region-hierarchy/context';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { DataType } from '@/constants/explore-section/list-views';
import { compactRecord } from '@/utils/dictionary';
import { tryCatch } from '@/api/utils';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

// NOTE: this is temporary hack to get the counts of a specific entity type
// TODO: this should be replaced by the /count endpoint when it's ready

export async function getBulkEntityCoreResult({
  brainRegionId,
  context,
}: {
  brainRegionId?: string | null;
  context?: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  const queryParams = compactRecord({
    page: 1,
    page_size: 1,
    within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
    within_brain_region_brain_region_id: brainRegionId,
    within_brain_region_ascendants: false,
  });
  const headers = compactRecord({
    accept: 'application/json',
    'content-type': 'application/json',
    ...getEntityCoreContext(context).headers,
  });

  const [emodelsCount, memodelsCount, singleNeuronSynaptomesCount] = await Promise.allSettled([
    api.get<EntityCoreResponse<any>>('/emodel', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/memodel', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/single-neuron-synaptome', {
      queryParams,
      headers,
    }),
  ]);

  const model = {
    [DataType.CircuitEModel]:
      emodelsCount.status === 'fulfilled'
        ? emodelsCount.value.pagination.total_items
        : 'Error counting EModels',
    [DataType.CircuitMEModel]:
      memodelsCount.status === 'fulfilled'
        ? memodelsCount.value.pagination.total_items
        : 'Error counting MEModels',
    [DataType.SingleNeuronSynaptome]:
      singleNeuronSynaptomesCount.status === 'fulfilled'
        ? singleNeuronSynaptomesCount.value.pagination.total_items
        : 'Error counting SingleNeuronSynaptomes',
  };

  const [
    reconstructionMorphologiesCount,
    electricalCellRecordingsCount,
    experimentalNeuronDensitiesCount,
    experimentalBoutonDensitiesCount,
    experimentalSynapsesPerConnectionsCount,
  ] = await Promise.allSettled([
    api.get<EntityCoreResponse<any>>('/reconstruction-morphology', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/electrical-cell-recording', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/experimental-neuron-density', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/experimental-bouton-density', {
      queryParams,
      headers,
    }),
    api.get<EntityCoreResponse<any>>('/experimental-synapses-per-connection', {
      queryParams,
      headers,
    }),
  ]);

  const experimental = {
    [DataType.ExperimentalNeuronMorphology]:
      reconstructionMorphologiesCount.status === 'fulfilled'
        ? reconstructionMorphologiesCount.value.pagination.total_items
        : 'Error counting ReconstructionMorphologies',
    [DataType.ExperimentalElectroPhysiology]:
      electricalCellRecordingsCount.status === 'fulfilled'
        ? electricalCellRecordingsCount.value.pagination.total_items
        : 'Error counting ElectricalCellRecordings',
    [DataType.ExperimentalNeuronDensity]:
      experimentalNeuronDensitiesCount.status === 'fulfilled'
        ? experimentalNeuronDensitiesCount.value.pagination.total_items
        : 'Error counting ExperimentalNeuronDensities',
    [DataType.ExperimentalBoutonDensity]:
      experimentalBoutonDensitiesCount.status === 'fulfilled'
        ? experimentalBoutonDensitiesCount.value.pagination.total_items
        : 'Error counting ExperimentalBoutonDensities',
    [DataType.ExperimentalSynapsePerConnection]:
      experimentalSynapsesPerConnectionsCount.status === 'fulfilled'
        ? experimentalSynapsesPerConnectionsCount.value.pagination.total_items
        : 'Error counting ExperimentalSynapsesPerConnections',
  };
  return { experimental, model };
}

export const GET = async (
  request: Request,
  _props: {
    params: Promise<{ virtualLabId: string; projectId: string }>;
    searchParams: Promise<{ brainRegion: string }>;
  }
) => {
  const { searchParams } = new URL(request.url);

  const virtualLabId = searchParams.get('virtualLabId');
  const projectId = searchParams.get('projectId');
  const brainRegionId = searchParams.get('brainRegionId');

  const { data, error } = await tryCatch(
    getBulkEntityCoreResult(
      compactRecord({
        context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
        brainRegionId,
      })
    )
  );
  if (error) throw error;
  const response = Response.json({ ...data });
  return response;
};
