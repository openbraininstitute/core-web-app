import { blueNaasUrl } from '@/config';
import { SimulationType } from '@/types/simulation/common';
import {
  CurrentInjectionSimulationConfig,
  RecordLocation,
  SimulationExperimentalSetup,
  SynaptomeConfig,
} from '@/types/simulation/single-neuron';

export const runGenericSingleNeuronSimulation = async ({
  vlabId,
  projectId,
  modelId,
  token,
  config,
}: {
  vlabId: string;
  projectId: string;
  modelId: string;
  token: string;
  config: {
    record_from: Array<RecordLocation>;
    conditions: SimulationExperimentalSetup;
    current_injection?: CurrentInjectionSimulationConfig;
    synaptome?: SynaptomeConfig;
    type: SimulationType;
    duration: number;
  };
}) => {

  console.log(config)

  const res = await fetch(
    `${blueNaasUrl}/entitycore/simulation/single-neuron/${vlabId}/${projectId}/run?model_id=${modelId}&realtime=True`,
    {
      method: 'post',
      headers: {
        accept: 'application/octet-stream',
        authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'virtual-lab-id': vlabId,
        'project-id': projectId,
      },
      body: JSON.stringify(config),
    }
  );

  console.log(await res.json());
  return res;
};
