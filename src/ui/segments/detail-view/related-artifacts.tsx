import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import Simulation from '@/features/entities/me-model/detail-view/simulation';
import { EntityTypeValue } from '@/entity-configuration/domain';
import Results from '@/features/entities/single-neuron-synaptome/detail-view/simulation';

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
    return <Simulation modelId={entity.id} />;
  }

  if (extendedType === 'single_neuron_synaptome') {
    return <Results modelId={entity.id} />;
  }

  notFound();
}
