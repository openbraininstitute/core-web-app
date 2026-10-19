import { kebabCase } from 'es-toolkit/compat';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IListingSplit, TListingRouteProps } from './types';

interface IFacetSplitConfig<V extends string> {
  dataType: TExtendedEntitiesTypeDict;
  /** the grid filter field the split owns (its filter is hidden on the sub-items) */
  field: string;
  /** explicit on purpose: wire params are never inferred from a naming convention */
  toParams: (value: V) => Record<string, unknown>;
  options: ReadonlyArray<{ value: V; label: string }>;
  listingProps?: TListingRouteProps;
}

/** Declare a split of `dataType` into one sub-item per value of the facet `field`. */
export function defineFacetSplit<V extends string>({
  dataType,
  field,
  toParams,
  options,
  listingProps,
}: IFacetSplitConfig<V>): IListingSplit {
  return {
    dataType,
    listingProps,
    options: options.map(({ value, label }) => ({
      slug: kebabCase(value),
      label,
      params: toParams(value),
      pinnedFields: [field],
    })),
  };
}
