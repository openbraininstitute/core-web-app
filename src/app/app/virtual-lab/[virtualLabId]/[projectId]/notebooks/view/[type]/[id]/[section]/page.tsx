import { notFound } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { NotebookDetail } from '@/features/notebooks/components/notebook-detail';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default async function NotebookViewSectionPage({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict>; id: string; section: string },
  null
>) {
  const { virtualLabId, projectId, type, id, section } = await params;

  const entityConfig = getEntityByExtendedType({
    type: resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type,
  });
  if (
    !entityConfig ||
    entityConfig.group !== EntityTypeGroup.Notebooks ||
    !entityConfig.detailViewSections?.includes(section as never)
  ) {
    notFound();
  }

  const { data: entity, error } = await tryCatch(
    retrieveEntity({
      type: entityConfig.extendedType,
      id,
      ctx: { virtualLabId, projectId },
    })
  );
  if (error || !entity) notFound();

  return (
    <NotebookDetail
      entity={entity as IAnalysisNotebookTemplate | IAnalysisNotebookResult}
      extendedType={entityConfig.extendedType}
    />
  );
}
