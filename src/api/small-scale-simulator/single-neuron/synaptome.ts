import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import type {
  SectionSynapses,
  TCreateSingleNeuronSynaptome,
} from '@/api/small-scale-simulator/types';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import type { WorkspaceContext } from '@/types/common';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

async function validateSynapseGenerationFormula(formula: string) {
  const api = await smallScaleSimulatorApi();

  return api.post<any>('/single-neuron/synaptome/validate-placement-formula', {
    body: { formula },
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function validateFormula(value: string) {
  try {
    return validateSynapseGenerationFormula(value);
  } catch (_error) {
    return false;
  }
}

type GetSynaptomePlacementParams = {
  ctx: WorkspaceContext;
  modelId: string;
  payload: {
    seed: number;
    config: TSingleNeuronSynaptomeConfiguration;
  };
  signal?: AbortSignal;
};

export async function getSynaptomePlacement({
  ctx,
  modelId,
  payload,
  signal,
}: GetSynaptomePlacementParams) {
  const api = await smallScaleSimulatorApi();

  return await api.post<{ synapses: Array<SectionSynapses> }>('/single-neuron/synaptome/generate', {
    queryParams: { model_id: modelId },
    headers: {
      ...getEntityCoreContext(ctx).headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      ...payload,
      config: {
        ...payload.config,
        distribution: 'formula',
      },
    },
    signal,
  });
}

type CreateSingleNeuronSynaptomeParams = {
  ctx: WorkspaceContext;
  modelInfo: TCreateSingleNeuronSynaptome;
  signal?: AbortSignal;
};

export async function createModel({ ctx, modelInfo, signal }: CreateSingleNeuronSynaptomeParams) {
  const api = await smallScaleSimulatorApi();

  return await api.post<ApiResponse<ISingleNeuronSynaptome>>('/single-neuron/synaptome', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: modelInfo,
    signal,
  });
}
