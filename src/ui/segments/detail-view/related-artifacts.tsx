import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import Simulation from '@/features/entities/me-model/detail-view/simulation';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { WorkspaceContext } from '@/types/common';
import {
  IEModel,
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types';
import { getReconstructionMorphology } from '@/api/entitycore/queries';

export default async function RelatedArtifacts({
  entity,
  extendedType,
  ctx,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
  ctx: WorkspaceContext;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (extendedType === 'memodel') {
    return <Simulation modelId={entity.id} />;
  }

  notFound();
}
