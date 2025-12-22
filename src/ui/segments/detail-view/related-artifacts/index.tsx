import { notFound } from 'next/navigation';
import { includes } from 'es-toolkit/compat';
import ICMRelatedArtifacts from './ion-channel-model';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import MEModelResults from '@/features/entities/me-model/detail-view/simulation';
import SynaptomeResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { RelatedCircuits } from '@/ui/segments/explore/circuit/elements/related-circuits';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

export default async function RelatedArtifacts({
  entity,
  extendedType,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
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
