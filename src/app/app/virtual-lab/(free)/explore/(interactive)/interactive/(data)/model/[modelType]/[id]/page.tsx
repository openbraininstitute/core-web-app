import { use } from 'react';
import { match } from 'ts-pattern';
import dynamic from 'next/dynamic';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

const EModelView = dynamic(() => import('@/page-wrappers/explore/e-model'));
const MEModelView = dynamic(() => import('@/page-wrappers/explore/me-model'));
const SingleNeuronSynaptomeView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-synaptome')
);
// const CircuitDetailView = dynamic(() => import('@/components/explore-section/Circuit/DetailView'));

type Params = {
  params: Promise<{
    id: string;
    modelType: ModelTypeNames;
    projectId: string;
    virtualLabId: string;
  }>;
};

export default function DetailPage(props: Params) {
  const { id, projectId, virtualLabId, modelType } = use(props.params);

  return match(modelType)
    .with(ModelTypeNames.E_MODEL, () => <EModelView params={{ id, projectId, virtualLabId }} />)
    .with(ModelTypeNames.ME_MODEL, () => (
      <MEModelView params={{ id, projectId, virtualLabId, modelType }} showViewMode />
    ))
    .with(ModelTypeNames.SINGLE_NEURON_SYNAPTOME, () => (
      <SingleNeuronSynaptomeView {...{ id, projectId, virtualLabId, modelType }} />
    ))
    .with(ModelTypeNames.CIRCUIT, () => (
      <div className="text-red-500">
        TODO: Will come after
        {/* <CircuitDetailView params={params} /> */}
      </div>
    ))
    .otherwise(() => null);
}
