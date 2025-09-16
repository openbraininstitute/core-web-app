import { useEffect, useState } from 'react';
import startsWith from 'lodash/startsWith';
import some from 'lodash/some';

import { useParams } from 'next/navigation';
import { getSession } from '@/authFetch';

import { getMEModel, getSingleNeuronSimulation } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { useAppNotification } from '@/components/notification';
import { getAssetElement } from '@/api/entitycore/utils';
import {
  SingleNeuronSimulation,
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';

import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';
import type { WorkspaceContext } from '@/types/common';
import type {
  IMEModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';

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
  const [synaptomeModel] = useState<ISingleNeuronSynaptome | null>(null);
  const [meModel, setMeModel] = useState<IMEModel | null>(null);

  const { error: notifyError } = useAppNotification();

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
        notifyError({ message: 'Error while loading the resource details', placement: 'topRight' });
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

export function useSimulationConfig({
  source,
}: {
  source: ISingleNeuronSimulation | ISingleNeuronSynaptomeSimulation;
}) {
  const params = useParams<WorkspaceContext>();
  const [simulationConfig, setSimulationConfig] = useState<SimulationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function getConfig() {
      setLoading(true);
      try {
        if (isMounted) {
          let config: SimulationPayload | null = null;
          if (source.type === 'single_neuron_simulation') {
            config = await singleNeuronSimulationApiQueryExpand.config(
              source as ISingleNeuronSimulation,
              params
            );
          } else if (source.type === 'single_neuron_synaptome_simulation') {
            config = await singleNeuronSynaptomeSimulationApiQueryExpand.config(
              source as ISingleNeuronSynaptomeSimulation,
              params
            );
          } else {
            throw Error('Retrieving this simulation config/results not supported');
          }
          if (isMounted) setSimulationConfig(config);
        }
      } catch (err) {
        if (isMounted && (err as { name: string }).name !== 'AbortError') {
          setError('Error while loading the experiment configuration and results');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    getConfig();
    return () => {
      isMounted = false;
    };
  }, [params, source]);

  return {
    loading,
    error,
    simulationConfig,
  };
}
