import { blueNaasUrl } from '@/config';
import { SimulationType } from '@/types/simulation/common';
import {
  CurrentInjectionSimulationConfig,
  RecordLocation,
  SimulationExperimentalSetup,
  SynaptomeConfig,
} from '@/types/simulation/single-neuron';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';

export const runGenericSingleNeuronSimulation = async ({
  vlabId,
  projectId,
  modelUrl,
  token,
  config,
}: {
  vlabId: string;
  projectId: string;
  modelUrl: string;
  token: string;
  config: {
    recordFrom: Array<RecordLocation>;
    conditions: SimulationExperimentalSetup;
    currentInjection?: CurrentInjectionSimulationConfig;
    synaptome?: SynaptomeConfig;
    type: SimulationType;
    duration: number;
  };
}) => {
  const formattedConfig = convertObjectKeysToSnakeCase(config);
  return await fetch(
    `${blueNaasUrl}/simulation/single-neuron/${vlabId}/${projectId}/run?model_id=${encodeURIComponent(modelUrl)}&realtime=True`,
    {
      method: 'post',
      headers: {
        accept: 'application/octet-stream',
        authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedConfig),
    }
  );
};
