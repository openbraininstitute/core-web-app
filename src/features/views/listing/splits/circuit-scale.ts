import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { defineFacetSplit } from './define-facet-split';

import type { TListingRouteProps } from './types';

type TSplitScale = Exclude<TCircuitScaleDictionary, typeof CircuitScaleDictionary.Single>;

/**
 * Sidebar labels. `satisfies` makes a new `CircuitScale` a compile error until it is
 * labelled. `single` is absent on purpose: it is the "Synaptome" sibling menu item, and
 * `Circuit.list` already excludes it.
 */
const SCALE_LABELS = {
  pair: 'Paired neurons',
  small: 'Small microcircuits',
  microcircuit: 'Microcircuits',
  region: 'Region circuits',
  system: 'System circuits',
  whole_brain: 'Whole brain circuits',
} as const satisfies Record<TSplitScale, string>;

/** Circuit's plugin body owns selection/download, so the route passes none (as `circuit/page.tsx`). */
const PLUGIN_HOSTED_LISTING_PROPS: TListingRouteProps = {};

export const circuitScaleSplit = defineFacetSplit({
  dataType: ExtendedEntitiesTypeDict.Circuit,
  field: 'scale',
  toParams: (scale) => ({ scale__in: [scale] }),
  // enum declaration order = sidebar order
  options: Object.values(CircuitScaleDictionary)
    .filter((scale): scale is TSplitScale => scale !== CircuitScaleDictionary.Single)
    .map((scale) => ({ value: scale, label: SCALE_LABELS[scale] })),
  listingProps: PLUGIN_HOSTED_LISTING_PROPS,
});
