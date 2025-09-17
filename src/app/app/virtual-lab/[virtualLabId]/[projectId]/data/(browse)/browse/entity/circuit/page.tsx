import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrowseCircuit } from '@/ui/segments/explore/circuit';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { KebabCase } from '@/utils/type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = await searchParams;

  return (
    <BrowseCircuit
      section={WorkspaceSection.Data}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      scope={scope ?? WorkspaceScope.Public}
      mainTableProps={{
        selectionType: undefined,
      }}
    />
  );
}
