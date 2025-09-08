import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import MEModelResults from '@/features/entities/me-model/detail-view/simulation';
import SynaptomeResults from '@/features/entities/single-neuron-synaptome/detail-view/simulation';
import { EntityTypeValue } from '@/entity-configuration/domain';
import RelatedCircuits from '@/features/entities/circuit/elements/tabs-content/related-circuits';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

export default async function RelatedArtifacts({
  entity,
  extendedType,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (extendedType === 'memodel') {
    return <MEModelResults modelId={entity.id} />;
  }

  if (extendedType === 'single_neuron_synaptome') {
    return <SynaptomeResults modelId={entity.id} />;
  }

  if (extendedType === 'circuit') {
    return <RelatedCircuits circuit={entity as ICircuit} />;
  }

  notFound();
}
