import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { BrowseEntityScopeProps } from '@/features/views/listing/types';

/** What a Data route passes the listing besides `dataType` (selection, download, delete). */
export type TListingRouteProps = Pick<
  BrowseEntityScopeProps,
  'mainTableProps' | 'allowDownload' | 'allowDelete'
>;

/**
 * One variant of a listing: the parent `dataType` seen through a pinned facet.
 * It is NOT a new data type, only a server-side param plus the removal of that facet's
 * filter UI.
 */
export interface IListingVariant {
  /** url segment and per-listing state discriminator */
  slug: string;
  /** the facet value this variant pins (what an entity of this variant holds in `group.field`) */
  value: string;
  /** sidebar text */
  label: string;
  /** wire params pinned onto every request; they win over the caller's and the user's */
  params: Readonly<Record<string, unknown>>;
  /** grid filter fields the pin owns; their filter UI is removed from the schema */
  pinnedFields: readonly string[];
}

/** A data type whose listing is offered as variants, i.e. sidebar sub-items (see `define-facet-variants.ts`). */
export interface IListingVariantGroup {
  dataType: TExtendedEntitiesTypeDict;
  /** the entity property the variants split on */
  field: string;
  variants: readonly IListingVariant[];
  /** route props for the sub-item pages; defaults to the standard Data listing props */
  listingProps?: TListingRouteProps;
}
