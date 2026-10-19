import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { DATA_BROWSE_LISTING_PROPS } from '@/features/views/listing/data-browse-entities';
import {
  getListingSplit,
  resolveListingSplitOption,
} from '@/features/views/listing/splits/registry';

import type { TWorkspaceScope } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

/** A sub-item of a split listing (`LISTING_SPLITS`), e.g. `.../entity/circuit/whole-brain`. */
export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: string; split: string },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = await searchParams;
  const { type, split: slug } = await params;

  const dataType = snakeCase(type);
  const listingSplit = getListingSplit(dataType);
  const option = resolveListingSplitOption(dataType, slug);
  const isKnownScope =
    !scope || scope === WorkspaceScope.Public || scope === WorkspaceScope.Project;
  if (!listingSplit || !option || !isKnownScope) notFound();

  return (
    // `key` remounts between sibling sub-items so an open mini-detail panel does not leak.
    <BrowseEntityScope
      key={option.slug}
      section={WorkspaceSection.Data}
      dataType={listingSplit.dataType}
      splitSlug={option.slug}
      {...(listingSplit.listingProps ?? DATA_BROWSE_LISTING_PROPS)}
    />
  );
}
