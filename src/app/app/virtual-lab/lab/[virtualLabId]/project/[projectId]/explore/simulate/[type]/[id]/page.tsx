import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

import { resolveSingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { resolveSingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { SimulationEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext, ServerSideComponentProp } from '@/types/common';

const SingleNeuronSynaptomeSimulationView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-synaptome-simulation')
);

const SingleNeuronSimulationView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-simulation')
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
    !['single_neuron_synaptome_simulation', 'single_neuron_simulation'].includes(entity.type)
  )
    notFound();

  if (entity.type === 'single_neuron_simulation') {
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
  }
  if (entity.type === 'single_neuron_synaptome_simulation') {
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
  }
  return null;
}
