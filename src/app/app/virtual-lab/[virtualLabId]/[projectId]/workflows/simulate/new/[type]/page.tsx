import snakeCase from 'es-toolkit/compat/snakeCase';
import { notFound } from 'next/navigation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowBrowseEntity } from '@/features/views/listing/browse-new-workflow';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { getBuildTypeFromSimulateType } from '@/ui/segments/workflows/elements/helpers';
import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
>) {
  const { type, virtualLabId, projectId } = await params;

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const buildType = getBuildTypeFromSimulateType(dataType);
  if (!buildType) return notFound();

  return <WorkflowBrowseEntity workspace={{ virtualLabId, projectId }} buildType={buildType} />;
}
