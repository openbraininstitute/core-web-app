'use client';

import snakeCase from 'es-toolkit/compat/snakeCase';
import { use } from 'react';

import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = use(searchParams);
  const { type } = use(params);

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;

  return (
    <BrowseEntityScope
      requireMiniDetailView
      section={WorkspaceSection.BuildWorkflow}
      requireBrainRegion={false}
      classNames={{ container: 'max-h-full' }}
      dataType={dataType}
      scope={scope ?? WorkspaceScope.Public}
      mainTableProps={{
        selectionType: undefined,
      }}
      miniViewProps={{
        section: WorkspaceSection.BuildWorkflow,
      }}
    />
  );
}
