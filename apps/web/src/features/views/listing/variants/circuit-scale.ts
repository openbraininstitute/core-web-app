import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { defineFacetVariants } from './define-facet-variants';

import type { TListingRouteProps } from './types';

type TVariantScale = Exclude<TCircuitScaleDictionary, typeof CircuitScaleDictionary.Single>;

/**
 * Sidebar labels. `satisfies` makes a new `CircuitScale` a compile error until it is
 * labelled. `single` is absent on purpose: it is the "Synaptome" sibling menu item, and
 * `Circuit.list` already excludes it.
 */
const SCALE_LABELS = {
  pair: 'Paired neuron circuits',
  small: 'Small microcircuits',
  microcircuit: 'Microcircuits',
  region: 'Region circuits',
  system: 'System circuits',
  whole_brain: 'Whole brain circuits',
} as const satisfies Record<TVariantScale, string>;

/** Circuit's plugin body owns selection/download, so the route passes none (as `circuit/page.tsx`). */
const PLUGIN_HOSTED_LISTING_PROPS: TListingRouteProps = {};

export const circuitScaleVariants = defineFacetVariants({
  dataType: ExtendedEntitiesTypeDict.Circuit,
  field: 'scale',
  toParams: (scale) => ({ scale__in: [scale] }),
  // enum declaration order = sidebar order
  variants: Object.values(CircuitScaleDictionary)
    .filter((scale): scale is TVariantScale => scale !== CircuitScaleDictionary.Single)
    .map((scale) => ({ value: scale, label: SCALE_LABELS[scale] })),
  listingProps: PLUGIN_HOSTED_LISTING_PROPS,
});
