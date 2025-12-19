import snakeCase from 'es-toolkit/compat/snakeCase';
import { notFound } from 'next/navigation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { getBuildTypeFromSimulateType } from '@/ui/segments/workflows/elements/helpers';
import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = await searchParams;
  const { type } = await params;

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const buildType = getBuildTypeFromSimulateType(dataType);
  if (!buildType) return notFound();

  return (
    <BrowseEntityScope
      requireMiniDetailView
      section={WorkspaceSection.SimulateWorkflow}
      requireBrainRegion={false}
      classNames={{ container: 'max-h-full' }}
      dataType={buildType}
      scope={scope ?? WorkspaceScope.Combined}
      mainTableProps={{
        selectionType: undefined,
      }}
      miniViewProps={{
        section: WorkspaceSection.SimulateWorkflow,
      }}
    />
  );
}
