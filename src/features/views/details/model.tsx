import { notFound } from 'next/navigation';
import { match } from 'ts-pattern';
import dynamic from 'next/dynamic';

import { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataType } from '@/constants/explore-section/list-views';

import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

const EModelDetailView = dynamic(() => import('@/page-wrappers/explore/e-model'));
const MEModelDetailView = dynamic(() => import('@/page-wrappers/explore/me-model'));
const SynaptomeDetailView = dynamic(
  () => import('@/page-wrappers/explore/single-neuron-synaptome')
);

type Props = WorkspaceContext & {
  id: string;
  type: ModelEntitySlugValue;
};

export default function DetailView(props: Props) {
  const entity = getEntityBySlug({ slug: props.type });
  if (!entity) notFound();

  return match<EntityCoreTypeConfig<any>>(entity)
    .with({ legacyType: DataType.CircuitEModel }, () => <EModelDetailView params={props} />)
    .with({ legacyType: DataType.CircuitMEModel }, () => <MEModelDetailView params={props} />)
    .with({ legacyType: DataType.SingleNeuronSynaptome }, () => <SynaptomeDetailView {...props} />)
    .otherwise(() => null);
}
