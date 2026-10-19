import { kebabCase } from 'es-toolkit/compat';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IListingVariantGroup, TListingRouteProps } from './types';

interface IFacetVariantsConfig<V extends string> {
  dataType: TExtendedEntitiesTypeDict;
  /** the grid filter field the variants own (its filter is hidden on the sub-items) */
  field: string;
  /** explicit on purpose: wire params are never inferred from a naming convention */
  toParams: (value: V) => Record<string, unknown>;
  variants: ReadonlyArray<{ value: V; label: string }>;
  listingProps?: TListingRouteProps;
}

/** Declare the variants of `dataType`: one sub-item per value of the facet `field`. */
export function defineFacetVariants<V extends string>({
  dataType,
  field,
  toParams,
  variants,
  listingProps,
}: IFacetVariantsConfig<V>): IListingVariantGroup {
  return {
    dataType,
    listingProps,
    variants: variants.map(({ value, label }) => ({
      slug: kebabCase(value),
      label,
      params: toParams(value),
      pinnedFields: [field],
    })),
  };
}
