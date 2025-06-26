import { bluenaasApi } from '@/api/bluenaas/utils';

import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';
import { getEntityCoreContext } from '@/api/entitycore/utils';

import type { SimulationType } from '@/types/simulation/common';
import type {
  CurrentInjectionSimulationConfig,
  RecordLocation,
  SimulationExperimentalSetup,
  SynaptomeConfig,
} from '@/types/simulation/single-neuron';

type SimulationConfiguration = {
  recordFrom: Array<RecordLocation>;
  conditions: SimulationExperimentalSetup;
  currentInjection?: CurrentInjectionSimulationConfig;
  synaptome?: SynaptomeConfig;
  type: SimulationType;
  duration: number;
};

export default async function runGenericSingleNeuronSimulation({
  ctx,
  modelId,
  config,
}: {
  ctx: { virtualLabId: string; projectId: string };
  modelId: string;
  config: SimulationConfiguration;
}) {
  const api = await bluenaasApi();
  const url = `/entitycore/simulation/single-neuron/${ctx.virtualLabId}/${ctx.projectId}/run`;
  const formattedConfig = convertObjectKeysToSnakeCase(config);
  return await api.post<Response>(
    url,
    {
      queryParams: {
        model_id: modelId,
        realtime: 'True',
      },
      body: formattedConfig,
      headers: {
        ...getEntityCoreContext(ctx).headers,
        'Content-Type': 'application/json',
        accept: 'application/octet-stream',
      },
    },
    { asRawResponse: true }
  );
}
