import { useEffect, useState } from 'react';
import startsWith from 'lodash/startsWith';
import some from 'lodash/some';

import { getSession } from '@/authFetch';

import { SimulationPayload } from '@/types/simulation/single-neuron';

import { SingleNeuronSynaptomeResource } from '@/types/synaptome';

import useNotification from '@/hooks/notifications';

import { IMEModel, ISingleNeuronSimulation } from '@/api/entitycore/types';
import { getMEModel, getSingleNeuronSimulation } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/simulation';
import { getAssetElement } from '@/api/entitycore/utils';

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
  const [simulationConfig, setSimulationConfig] = useState<SimulationPayload | null>(null);
  const [synaptomeModel] = useState<SingleNeuronSynaptomeResource | null>(null);
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

        const meModelData = await getMEModel({ id: simulationData.me_model.id, context });
        setMeModel(meModelData);

        const configAsset = getAssetElement({
          assets: simulationData.assets,
          filter: (i) =>
            i.label === SingleNeuronSimulation.asset.configfile ||
            some(['simulation-config'], (prefix) => startsWith(i.path, prefix)),
        });

        if (!configAsset) throw new Error('Simulation config not found');

        const fileAsJson = await downloadAsset<SimulationPayload | null>({
          ctx: { virtualLabId, projectId },
          entityType: SingleNeuronSimulation.type,
          entityId: simulationData.id,
          id: configAsset.id,
        });

        setSimulationConfig(fileAsJson);
      } catch (error) {
        notifyError('Error while loading the resource details', undefined, 'topRight');
      }
    })();
  }, [id, virtualLabId, projectId, notifyError, setMeModel, setSimulationConfig, type]);

  return {
    simulation,
    simulationConfig,
    meModel,
    synaptomeModel,
  };
}
