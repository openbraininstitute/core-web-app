import { notFound } from 'next/navigation';
import { match } from 'ts-pattern';

import SynaptomeDetailView from '@/page-wrappers/explore/single-neuron-synaptome';
import MEModelDetailView from '@/page-wrappers/explore/me-model';
import EModelDetailView from '@/page-wrappers/explore/e-model';
import CircuitDetailView from '@/page-wrappers/explore/circuit';

import { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tempCheckCircuitInDev } from '@/temp-circuit-check';

import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  id: string;
  type: ModelEntitySlugValue;
};

export default async function DetailView(props: Props) {
  const type = tempCheckCircuitInDev(props.type);
  const entity = getEntityBySlug({ slug: type });
  if (!entity) notFound();

  return match<EntityCoreTypeConfig<any>>(entity)
    .with({ extendedType: ExtendedEntitiesTypeDict.Emodel }, () => (
      <EModelDetailView params={props} />
    ))
    .with({ extendedType: ExtendedEntitiesTypeDict.Memodel }, () => (
      <MEModelDetailView params={props} />
    ))
    .with({ extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }, () => (
      <SynaptomeDetailView params={props} />
    ))
    .with({ extendedType: ExtendedEntitiesTypeDict.Circuit }, () => (
      <CircuitDetailView params={props} />
    ))
    .otherwise(() => null);
}
