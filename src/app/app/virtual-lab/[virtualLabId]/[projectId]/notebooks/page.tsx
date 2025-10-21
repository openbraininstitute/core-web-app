import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function NotebooksPage({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const params = promisedParams;
  const { projectId, virtualLabId } = await params;

  return (
    <BrowseEntityScope
      section={WorkspaceSection.Notebooks}
      dataType={ExtendedEntitiesTypeDict.Notebook}
      scope={WorkspaceScope.Public}
      requireBrainRegion={false}
      requireMiniDetailView={false}
    />
  );
}
