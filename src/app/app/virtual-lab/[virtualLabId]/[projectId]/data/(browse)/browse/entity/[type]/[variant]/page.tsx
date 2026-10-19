import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { DATA_BROWSE_LISTING_PROPS } from '@/features/views/listing/data-browse-entities';
import { getVariantGroup, resolveListingVariant } from '@/features/views/listing/variants/registry';

import type { TWorkspaceScope } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

/** A variant of a listing (`LISTING_VARIANT_GROUPS`), e.g. `.../entity/circuit/whole-brain`. */
export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext & { type: string; variant: string },
  { scope: TWorkspaceScope | null }
>) {
  const { scope } = await searchParams;
  const { type, variant: slug } = await params;

  const dataType = snakeCase(type);
  const group = getVariantGroup(dataType);
  const variant = resolveListingVariant(dataType, slug);
  const isKnownScope =
    !scope || scope === WorkspaceScope.Public || scope === WorkspaceScope.Project;
  if (!group || !variant || !isKnownScope) notFound();

  return (
    // `key` remounts between sibling sub-items so an open mini-detail panel does not leak.
    <BrowseEntityScope
      key={variant.slug}
      section={WorkspaceSection.Data}
      dataType={group.dataType}
      variantSlug={variant.slug}
      {...(group.listingProps ?? DATA_BROWSE_LISTING_PROPS)}
    />
  );
}
