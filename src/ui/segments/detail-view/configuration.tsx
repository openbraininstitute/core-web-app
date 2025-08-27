import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import EModelView from '@/components/build-section/cell-model-assignment/e-model/EModelView';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { WorkspaceContext } from '@/types/common';
import {
  IEModel,
  IMEModel,
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types';
import { getReconstructionMorphology } from '@/api/entitycore/queries';
import MEModelConfig from '@/features/entities/me-model/detail-view/configuration';

export default async function Configuration({
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

  if (extendedType === 'emodel') {
    let morphology: IReconstructionMorphologyExpanded | IReconstructionMorphology;

    try {
      morphology = await getReconstructionMorphology({
        id: (entity as IEModel).exemplar_morphology.id,
        expand: 'measurement_annotation',
        context: ctx,
      });
    } catch {
      notFound();
    }

    return (
      <EModelView
        params={{ id: entity.id, virtualLabId: ctx.virtualLabId, projectId: ctx.projectId }}
        payload={{ source: entity as IEModel, exemplar_morphology: morphology }}
      />
    );
  }

  if (extendedType === 'memodel') {
    return <MEModelConfig model={entity as IMEModel} />;
  }

  notFound();
}
