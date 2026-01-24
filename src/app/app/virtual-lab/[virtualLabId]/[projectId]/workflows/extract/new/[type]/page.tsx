import snakeCase from 'es-toolkit/compat/snakeCase';
import { notFound } from 'next/navigation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { WorkspaceSection } from '@/constants';
import { WorkflowBrowseEntity } from '@/features/views/listing/browse-new-workflow';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
>) {
  const { type, virtualLabId, projectId } = await params;

  const dataType = convertEntitySlugToExtendedType({ type });
  if (!dataType) return notFound();

  return (
    <WorkflowBrowseEntity
      workspace={{ virtualLabId, projectId }}
      baseModelType={dataType}
      section={WorkspaceSection.ExtractWorkflow}
    />
  );
}
