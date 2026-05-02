import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { detailPageSectionRenderer } from '@/features/details-page';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { section: TDetailViewSectionDict; id: string; type: string },
  null
>) {
  const { virtualLabId, projectId, section, type, id } = await params;
  const context = { virtualLabId, projectId };

  const entityType = getEntityByExtendedType({
    type: snakeCase(type) as TExtendedEntitiesTypeDict,
  });

  if (!entityType) notFound();

  const { data: entity, error } = await tryCatch(
    retrieveEntity({
      type: snakeCase(type) as TExtendedEntitiesTypeDict,
      ctx: context,
      id,
    })
  );

  if (!entity || error) notFound();

  const hasSubject = 'subject' in entity && !!entity.subject;
  const isSubjectSection = section === DetailViewSectionsDict.Subject;
  const sectionIsValid =
    entityType.detailViewSections?.includes(section) || (isSubjectSection && hasSubject);
  if (!sectionIsValid) notFound();

  const content = detailPageSectionRenderer({
    context,
    entity,
    entityType,
    section,
    isWorkflow: false,
  });

  if (!content) notFound();

  return content;
}
