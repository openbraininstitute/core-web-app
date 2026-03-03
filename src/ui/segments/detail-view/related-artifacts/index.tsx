import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import MEModelResults from '@/features/entities/me-model/detail-view/simulation';
import SynaptomeResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { ICMRelatedArtifacts } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/index';
import { RelatedCircuits } from '@/ui/segments/explore/circuit/elements/related-circuits';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export default async function RelatedArtifacts({
  entity,
  extendedType,
  context,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
  context: WorkspaceContext;
}) {
  return match({ entityConfig: getEntityByExtendedType({ type: extendedType }) })
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.Memodel } }, () => (
      <MEModelResults modelId={entity.id} context={context} />
    ))
    .with(
      { entityConfig: { extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome } },
      () => <SynaptomeResults modelId={entity.id} context={context} />
    )
    .with(
      {
        entityConfig: {
          extendedType: P.union(
            ExtendedEntitiesTypeDict.Circuit,
            ExtendedEntitiesTypeDict.MEModelWithSynapses
          ),
        },
      },
      () => <RelatedCircuits circuit={entity as ICircuit} />
    )
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.IonChannelModel } }, () => (
      <ICMRelatedArtifacts icm={entity as IonChannelModel} context={context} />
    ))
    .otherwise(() => notFound());
}
