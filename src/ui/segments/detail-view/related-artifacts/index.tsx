import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import MEModelResults from '@/features/entities/me-model/detail-view/simulation';
import SynaptomeResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { RelatedCircuits } from '@/ui/segments/explore/circuit/elements/related-circuits';

import ICMRelatedArtifacts from './ion-channel-model';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

export default async function RelatedArtifacts({
  entity,
  extendedType,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (extendedType === ExtendedEntitiesTypeDict.Memodel) {
    return <MEModelResults modelId={entity.id} />;
  }

  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptome) {
    return <SynaptomeResults modelId={entity.id} />;
  }

  if (
    includes(
      [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.MEModelWithSynapses],
      extendedType
    )
  ) {
    return <RelatedCircuits circuit={entity as ICircuit} />;
  }

  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModel) {
    return <ICMRelatedArtifacts icm={entity as IonChannelModel} />;
  }

  notFound();
}
