import { useEffect, useState } from 'react';

import { fetchJsonFileByUrl, fetchResourceById } from '@/api/nexus';
import { getSession } from '@/authFetch';
import { nexus } from '@/config';
import { SynaptomeSimulation, SingleNeuronSimulation } from '@/types/nexus';
import { SimulationPayload } from '@/types/simulation/single-neuron';
import { NexusMEModel } from '@/types/me-model';
import { SingleNeuronSynaptomeResource } from '@/types/synaptome';
import { ensureArray } from '@/util/nexus';
import useNotification from '@/hooks/notifications';
import { DeepSnakeCase, convertObjectKeystoCamelCase } from '@/util/object-keys-format';
import type { EntityCoreDataType, IAsset } from '@/api/entitycore/types/shared/global';
import {
  IMEModel,
  IReconstructionMorphology,
  ISingleNeuronSimulation,
} from '@/api/entitycore/types';
import {
  getMEModel,
  getReconstructionMorphology,
  getSingleNeuronSimulation,
} from '@/api/entitycore/queries';
import { getMorphology } from '@/api/bluenaas';
import { downloadAsset, getAsset, getAssets } from '@/api/entitycore/queries/assets';

export function useSimulation({
  id,
  virtualLabId,
  projectId,
  type,
}: {
  id: string;
  virtualLabId: string;
  projectId: string;
  type: 'single-neuron-simulation' | 'synaptome-simulation';
}) {
  const [simulation, setSimulation] = useState<ISingleNeuronSimulation | null>(null);
  const [morphology, setMorphology] = useState<IReconstructionMorphology | null>(null);
  const [simulationConfig, setSimulationConfig] = useState<SimulationPayload | null>(null);
  // const [synaptomeModel, setSynaptomeModel] = useState<SingleNeuronSynaptomeResource | null>(null);
  const [meModel, setMeModel] = useState<IMEModel | null>(null);

  const { error: notifyError } = useNotification();

  useEffect(() => {
    const context = { virtualLabId, projectId };
    (async () => {
      try {
        const session = await getSession();
        if (!session) throw new Error('no session');
        const simulationData = await getSingleNeuronSimulation({
          id,
          context,
        });

        setSimulation(simulationData);
        // let synaptomeResource = null;
        // if (type === 'synaptome-simulation') {
        //   synaptomeResource = await fetchResourceById<SingleNeuronSynaptomeResource>(
        //     simulationResourceObject.used['@id'],
        //     session,
        //     simulationResourceObject.used['@id'].startsWith(nexus.defaultIdBaseUrl)
        //       ? {}
        //       : {
        //           org,
        //           project,
        //         }
        //   );
        //   setSynaptomeModel(synaptomeResource);
        // }
        // const meModelUrl =
        //   type === 'synaptome-simulation' && synaptomeResource
        //     ? synaptomeResource.used['@id']
        //     : simulationResourceObject.used['@id'];

        const meModelData = await getMEModel({ id: simulationData.me_model.id, context });
        setMeModel(meModelData);

        const assets = await getAssets({
          entityType: 'single-neuron-simulation',
          ctx: { virtualLabId, projectId },
          entityId: simulationData.id,
        });

        if (!assets || assets.data.length === 0) throw new Error();

        const file = await downloadAsset({
          ctx: { virtualLabId, projectId },
          entityType: 'single-neuron-simulation',
          entityId: simulationData.id,
          id: assets.data[0].id,
        });

        const json = JSON.parse(new TextDecoder('utf-8').decode(file));
        setSimulationConfig(json);

        // const distribution = ensureArray(simulationResourceObject.distribution)[0].contentUrl;
        // const simulationDistribution = await fetchJsonFileByUrl<DeepSnakeCase<SimulationPayload>>(
        //   distribution,
        //   session
        // );
        // setSimulationConfig({
        //   simulation: Object.keys(simulationDistribution.simulation).reduce((prev, curr) => {
        //     return {
        //       ...prev,
        //       [curr]: convertObjectKeystoCamelCase(simulationDistribution.simulation[curr]),
        //     };
        //   }, {}),
        //   stimulus: convertObjectKeystoCamelCase(simulationDistribution.stimulus),
        //   config: convertObjectKeystoCamelCase(simulationDistribution.config),
        // });
      } catch (error) {
        notifyError('Error while loading the resource details', undefined, 'topRight');
      }
    })();
  }, [id, virtualLabId, projectId, notifyError, setMeModel, setSimulationConfig, type]);

  return {
    simulation,
    morphology,
    simulationConfig,
    meModel,
    // synaptomeModel,
  };
}
