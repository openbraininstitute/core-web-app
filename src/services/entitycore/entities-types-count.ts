import { cache } from 'react';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { DataType } from '@/constants/explore-section/list-views';

import type { ExperimentalDataType } from '@/entity-configuration/domain/experimental';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ModelDataType } from '@/entity-configuration/domain/model';
import type { WorkspaceContext } from '@/types/common';

export type BulkEntityCoreCountResult = {
  experimental: Record<ExperimentalDataType, number | string>;
  model: Record<ModelDataType, number | string>;
};

// NOTE: this is temporary hack to get the counts of a specific entity type
// TODO: this should be replaced by the /count endpoint when it's ready

export async function getBulkEntityCoreResult({
  brainRegion,
  context,
}: {
  brainRegion?: string | null;
  context?: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  const brainRegionId = brainRegion
    ? Number(decodeURIComponent(brainRegion).split('/').pop())
    : undefined;

  const queryParams = { brain_region_id: brainRegionId, page: 1, page_size: 1 };
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    ...getEntityCoreContext(context).headers,
  };

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

export const getBulkEntityCoreCount = cache(getBulkEntityCoreResult);
