import { isPlainObject } from '@/features/scan-config/components/utils';

import type { ConfigValue } from '@/features/scan-config/types';

const MECHANISM_REGIONS_KEY = 'mechanism_regions';
const PARAMETERS_KEY = 'parameters';

/**
 * Removes every `mechanism_regions.<choice>.parameters` entry belonging to any of the given model
 * names, across all regions. Parameter keys are `${param}_${modelName}`, so a key belongs to a
 * removed model when it ends with `_${modelName}`.
 *
 * Returns the same `mechanisms` object (unchanged reference) when there is nothing to prune.
 */
export function pruneRegionParametersForModelNames(
  mechanisms: Record<string, ConfigValue>,
  removedModelNames: readonly string[]
): Record<string, ConfigValue> {
  if (removedModelNames.length === 0) return mechanisms;

  const regions = mechanisms[MECHANISM_REGIONS_KEY];
  if (!isPlainObject(regions)) return mechanisms;

  const suffixes = removedModelNames.map((name) => `_${name}`);
  const belongsToRemoved = (key: string) => suffixes.some((suffix) => key.endsWith(suffix));

  let changed = false;
  const nextRegions: Record<string, ConfigValue> = {};

  for (const [regionKey, region] of Object.entries(regions)) {
    if (!isPlainObject(region) || !isPlainObject(region[PARAMETERS_KEY])) {
      nextRegions[regionKey] = region;
      continue;
    }

    const parameters = region[PARAMETERS_KEY];
    const kept: Record<string, ConfigValue> = {};
    let regionChanged = false;

    for (const [key, val] of Object.entries(parameters)) {
      if (belongsToRemoved(key)) {
        regionChanged = true;
      } else {
        kept[key] = val;
      }
    }

    if (regionChanged) {
      changed = true;
      nextRegions[regionKey] = { ...region, [PARAMETERS_KEY]: kept };
    } else {
      nextRegions[regionKey] = region;
    }
  }

  if (!changed) return mechanisms;

  return { ...mechanisms, [MECHANISM_REGIONS_KEY]: nextRegions };
}
