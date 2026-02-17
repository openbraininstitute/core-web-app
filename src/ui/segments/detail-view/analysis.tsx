import { notFound } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  circuitTypes,
  type EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import Analysis from '@/features/model-analysis/explorer/container';
import Overview from '@/ui/segments/explore/circuit/elements/overview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityTypeValue } from '@/entity-configuration/domain';

export default async function Configuration({
  entity,
  extendedType,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (circuitTypes.includes(extendedType)) {
    return <Overview circuit={entity as ICircuit} />;
  }
  if (
    extendedType === ExtendedEntitiesTypeDict.Memodel ||
    extendedType === ExtendedEntitiesTypeDict.Emodel
  )
    return <Analysis />;

  return notFound();
}
