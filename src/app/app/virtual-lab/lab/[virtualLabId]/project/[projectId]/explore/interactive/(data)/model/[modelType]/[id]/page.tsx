import dynamic from 'next/dynamic';
import { match } from 'ts-pattern';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

import type { ServerSideComponentProp } from '@/types/common';

const EModelDetailView = dynamic(() => import('@/page-wrappers/explore/e-model'));
const MEModelDetailView = dynamic(() => import('@/page-wrappers/explore/me-model'));
const SynaptomeDetailView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-synaptome')
);

export default async function DetailPage(
  props: ServerSideComponentProp<
    {
      id: string;
      modelType: ModelTypeNames;
      projectId: string;
      virtualLabId: string;
    },
    null
  >
) {
  const params = await props.params;

  return match(params.modelType)
    .with(ModelTypeNames.E_MODEL, () => <EModelDetailView params={params} />)
    .with(ModelTypeNames.ME_MODEL, () => <MEModelDetailView params={params} />)
    .with(ModelTypeNames.SINGLE_NEURON_SYNAPTOME, () => <SynaptomeDetailView {...params} />)
    .otherwise(() => null);
}
