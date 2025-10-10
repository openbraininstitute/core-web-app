import snakeCase from 'es-toolkit/compat/snakeCase';

import { BrowseAction } from '@/ui/segments/workflows/elements/browse-build-action';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';
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

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="h-full w-full">
        <BrowseEntityScope
          section={WorkspaceSection.BuildWorkflow}
          requireBrainRegion={false}
          requireMiniDetailView={false}
          classNames={{ container: 'max-h-full' }}
          dataType={dataType}
          scope={scope ?? WorkspaceScope.Public}
          miniViewProps={{ section: WorkspaceSection.BuildWorkflow }}
        />
      </div>
      <div className="mt-auto flex w-full items-center justify-end">
        <BrowseAction />
      </div>
    </div>
  );
}
