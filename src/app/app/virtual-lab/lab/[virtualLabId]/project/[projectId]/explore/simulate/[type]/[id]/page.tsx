import { notFound } from 'next/navigation';
import { match } from 'ts-pattern';
import dynamic from 'next/dynamic';

import { resolveSingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { resolveSingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/simulation-campaign';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { SimulationEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext, ServerSideComponentProp } from '@/types/common';

const SingleNeuronSynaptomeSimulationView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-synaptome-simulation')
);

const SingleNeuronSimulationView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-simulation')
);

const SmallCircuitSimulation = dynamic(
  () => import('@/page-wrappers/explore/small-circuit-simulation')
);

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: SimulationEntitySlugValue; id: string },
  null
>) {
  const { virtualLabId, projectId, type, id } = await promisedParams;
  const entity = getEntityBySlug({ slug: type });

  if (
    !entity ||
    ![
      'single_neuron_synaptome_simulation',
      'single_neuron_simulation',
      'simulation_campaign',
    ].includes(entity.type)
  )
    notFound();

  return match(entity.type)
    .with('single_neuron_simulation', async () => {
      const singleNeuronSimulationPayload = await resolveSingleNeuronSimulation(id, {
        virtualLabId,
        projectId,
      });

      return (
        <SingleNeuronSimulationView
          params={{ id, virtualLabId, projectId }}
          payload={singleNeuronSimulationPayload}
        />
      );
    })
    .with('single_neuron_synaptome_simulation', async () => {
      const singleNeuronSynaptomeSimulationPayload = await resolveSingleNeuronSynaptomeSimulation(
        id,
        { virtualLabId, projectId }
      );

      return (
        <SingleNeuronSynaptomeSimulationView
          key="synaptome-simulation"
          payload={singleNeuronSynaptomeSimulationPayload}
        />
      );
    })
    .with('simulation_campaign', async () => {
      const { campaign, simulation, config } = await resolveSimulationByCampaignId({
        id,
        context: { virtualLabId, projectId },
      });

      if (!simulation) {
        return notFound();
      }

      return (
        <SmallCircuitSimulation
          payload={{ campaign, simulation, config }}
          params={{ virtualLabId, projectId, id }}
        />
      );
    })
    .otherwise(() => null);
}
