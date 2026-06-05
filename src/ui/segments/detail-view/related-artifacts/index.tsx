import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { ViewVariant } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import MEModelResults from '@/features/entities/me-model/detail-view/simulation';
import SynaptomeResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { ICMRelatedArtifacts } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/index';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';
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
  const entityConfig = getEntityByExtendedType({ type: extendedType });
  const fieldVariant = entityConfig
    ? detailViewVariantFromGroup(entityConfig.group)
    : ViewVariant.Light;

  return match({ entityConfig })
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.Memodel } }, () => (
      <MEModelResults modelId={entity.id} context={context} variant={fieldVariant} />
    ))
    .with(
      { entityConfig: { extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome } },
      () => <SynaptomeResults modelId={entity.id} context={context} variant={fieldVariant} />
    )
    .with(
      {
        entityConfig: {
          extendedType: P.union(
            ExtendedEntitiesTypeDict.Circuit,
            ExtendedEntitiesTypeDict.SingleNeuronCircuit
          ),
        },
      },
      () => <RelatedCircuits circuit={entity as ICircuit} variant={fieldVariant} />
    )
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.IonChannelModel } }, () => (
      <ICMRelatedArtifacts
        icm={entity as IonChannelModel}
        context={context}
        variant={fieldVariant}
      />
    ))
    .otherwise(() => notFound());
}
