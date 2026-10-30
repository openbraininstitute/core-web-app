import { notFound } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { circuitTypes, getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import Analysis from '@/features/model-analysis/explorer/container';
import IonChannelModelAnalysis from '@/ui/segments/detail-view/analysis/ion-channel-model';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';
import Overview from '@/ui/segments/explore/circuit/elements/overview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export default async function AnalysisSection({
  entity,
  extendedType,
  context,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
  context: WorkspaceContext;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  const fieldVariant = detailViewVariantFromGroup(entityType.group);

  if (circuitTypes.includes(extendedType)) {
    return <Overview circuit={entity as ICircuit} variant={fieldVariant} />;
  }
  if (
    extendedType === ExtendedEntitiesTypeDict.Memodel ||
    extendedType === ExtendedEntitiesTypeDict.Emodel
  ) {
    return <Analysis entity={entity} variant={fieldVariant} />;
  }
  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModel) {
    return (
      <IonChannelModelAnalysis
        icm={entity as IonChannelModel}
        ctx={context}
        variant={fieldVariant}
      />
    );
  }

  return notFound();
}
