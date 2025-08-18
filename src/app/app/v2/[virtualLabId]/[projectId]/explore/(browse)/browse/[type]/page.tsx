import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';
import snakeCase from 'lodash/snakeCase';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseLibraryScope } from '@/features/views/listing/browse-library';
import { BrowseStandardScope } from '@/features/views/listing/browse-scope';
import { WorkspaceScope } from '@/constants';
import { KebabCase } from '@/utils/type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope: TWorkspaceScope | null }
>) {
  const { type } = await params;
  const { scope } = await searchParams;

  const entity = getEntityByExtendedType({ type: snakeCase(type) as TExtendedEntitiesTypeDict });

  const content = match({ scope, entity })
    .with({ entity: P.nullish }, () => notFound())
    .with(
      {
        scope: P.union(P.nullish, WorkspaceScope.Public, WorkspaceScope.Project),
        entity: P.not(P.nullish),
      },
      () => <BrowseStandardScope />
    )
    .with({ scope: WorkspaceScope.Bookmarks }, () => <BrowseLibraryScope />)
    .otherwise(() => notFound());

  return content;
}
