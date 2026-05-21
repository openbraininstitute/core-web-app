import { notFound } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { circuitTypes, getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import Analysis from '@/features/model-analysis/explorer/container';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';
import Overview from '@/ui/segments/explore/circuit/elements/overview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

export default async function Configuration({
  entity,
  extendedType,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (circuitTypes.includes(extendedType)) {
    return <Overview circuit={entity as ICircuit} />;
  }
  if (
    extendedType === ExtendedEntitiesTypeDict.Memodel ||
    extendedType === ExtendedEntitiesTypeDict.Emodel
  ) {
    const fieldVariant = detailViewVariantFromGroup(entityType.group);
    return <Analysis entity={entity} variant={fieldVariant} />;
  }

  return notFound();
}
