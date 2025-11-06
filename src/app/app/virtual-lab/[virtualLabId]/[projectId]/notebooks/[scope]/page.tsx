import { notFound } from 'next/navigation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function NotebooksPage({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext & { scope: 'public' | 'private' }, null>) {
  const params = await promisedParams;
  const { scope } = params;
  if (!['public', 'private'].includes(scope)) notFound();

  return (
    <BrowseEntityScope
      section={WorkspaceSection.Notebooks}
      dataType={ExtendedEntitiesTypeDict.Notebook}
      scope={scope === 'public' ? WorkspaceScope.Public : WorkspaceScope.Project}
      requireBrainRegion={false}
      requireMiniDetailView={false}
    />
  );
}
