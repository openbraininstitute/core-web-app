import { notFound } from 'next/navigation';
import { match } from 'ts-pattern';
import dynamic from 'next/dynamic';

import { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataType } from '@/constants/explore-section/list-views';

import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';

const SingleNeuronSimulationView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-simulation')
);

export default async function Page(
  props: ServerSideComponentProp<
    WorkspaceContext & { simType: ModelEntitySlugValue; id: string },
    null
  >
) {
  const params = await props.params;

  const entity = getEntityBySlug({ slug: params.simType });

  if (!entity) notFound();

  return match<EntityCoreTypeConfig<any>>(entity)
    .with({ legacyType: DataType.SingleNeuronSimulation }, () => (
      <SingleNeuronSimulationView
        params={{ id: params.id, virtualLabId: params.virtualLabId, projectId: params.projectId }}
        simulationType="single-neuron-simulation"
      />
    ))
    .otherwise(() => null);
}
