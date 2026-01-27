import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import type { WorkspaceContext } from '@/types/common';
import type { SimulationType } from '@/types/small-scale-simulator/common';
import type {
  CurrentInjectionSimulationConfig,
  RecordLocation,
  SimulationExperimentalSetup,
  SynaptomeConfig,
} from '@/types/small-scale-simulator/single-neuron';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';

type SimulationConfiguration = {
  recordFrom: Array<RecordLocation>;
  conditions: SimulationExperimentalSetup;
  currentInjection?: CurrentInjectionSimulationConfig;
  synaptome?: SynaptomeConfig;
  type: SimulationType;
  duration: number;
};

export async function runSimulation({
  ctx,
  modelId,
  config,
  signal,
}: {
  ctx: WorkspaceContext;
  modelId: string;
  config: SimulationConfiguration;
  signal?: AbortSignal;
}) {
  const api = await smallScaleSimulatorApi();
  const url = '/single-neuron/simulation/run';
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
      signal,
    },
    { asRawResponse: true }
  );
}
