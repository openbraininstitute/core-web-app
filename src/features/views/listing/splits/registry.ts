import { circuitScaleSplit } from './circuit-scale';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IListingSplit, IListingSplitOption } from './types';

/**
 * Every split listing. Adding a split = one `defineFacetSplit` file + one line here
 * (the parent dataType must also be in `DATA_BROWSE_ALLOWED_ENTITIES`).
 */
export const LISTING_SPLITS: readonly IListingSplit[] = [circuitScaleSplit];

export function getListingSplit(dataType: string): IListingSplit | undefined {
  return LISTING_SPLITS.find((split) => split.dataType === (dataType as TExtendedEntitiesTypeDict));
}

export function resolveListingSplitOption(
  dataType: string,
  slug: string | undefined
): IListingSplitOption | undefined {
  return slug === undefined
    ? undefined
    : getListingSplit(dataType)?.options.find((option) => option.slug === slug);
}
