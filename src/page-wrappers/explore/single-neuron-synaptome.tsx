import isNil from 'es-toolkit/compat/isNil';

import Detail from '@/features/entities/single-neuron-synaptome/detail-view';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { SingleNeuronSynaptome as entity } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { applyEntityExpansions } from '@/entity-configuration/domain/helpers';
import { ErrorComponent } from '@/components/GenericErrorFallback';
import { tryCatch } from '@/api/utils';

import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';
import type { IMEModel } from '@/api/entitycore/types';
import type { Prettify } from '@/utils/type';

type ExpandType = Prettify<{
  memodel: IMEModel;
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null;
}>;

type Props = {
  params: WorkspaceContext & {
    id: string;
  };
};

export async function loadExpandedSingleNeuronSynaptome({
  id,
  virtualLabId,
  projectId,
}: Props['params']) {
  const { data: source, error } = await tryCatch(
    getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } })
  );

  if (error) {
    throw new Error('Failed to load single neuron synaptome entity details');
  }

  let data = {} as ExpandType | null;
  let error1 = null;
  if (entity.api.expand) {
    ({ data, error: error1 } = await tryCatch(
      applyEntityExpansions<ISingleNeuronSynaptome, ExpandType>(entity, source, {
        virtualLabId,
        projectId,
      })
    ));
  }

  if (error1 || isNil(data)) {
    throw new Error('Failed to load single neuron synaptome relative data');
  }
  return {
    source,
    ...data,
  };
}

export default async function Page({ params }: Props) {
  const { id, virtualLabId, projectId } = params;
  const { data, error } = await tryCatch(
    loadExpandedSingleNeuronSynaptome({ virtualLabId, projectId, id })
  );

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return <Detail params={{ virtualLabId, projectId }} payload={data} />;
}
