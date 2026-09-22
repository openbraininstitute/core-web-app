'use client';

import { useModelNameRegistry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/model-name-registry-context';
import { pruneRegionParametersForModelNames } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/prune-region-parameters';
import { ModelIdentifierMultiple } from '@/features/scan-config/components/ui-elements/model-identifier-multiple';
import { isPlainObject } from '@/features/scan-config/components/utils';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

type Props = {
  /** the `emodel_optimisation_parameters` root element schema */
  rootSchema: IEModelOptimisationParameters;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
};

const ION_CHANNEL_MODELS_KEY = 'ion_channel_models';
const MECHANISM_REGIONS_KEY = 'mechanism_regions';

/** Collects the `id_str`s present in a `mechanisms.ion_channel_models` value. */
function collectModelIds(ionChannelModels: ConfigValue): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(ionChannelModels)) return ids;

  for (const model of ionChannelModels) {
    if (isPlainObject(model) && typeof model.id_str === 'string') {
      ids.add(model.id_str);
    }
  }
  return ids;
}

/**
 * Keeps region assignments consistent with the master `mechanisms.ion_channel_models` list.
 *
 * For every model dropped from the master list, this:
 *  - removes it from each `mechanism_regions.<choice>.ion_channel_models`, and
 *  - strips its `mechanism_regions.<choice>.parameters` entries (keys `${param}_${modelName}`),
 *    resolving the name from the template-scoped model-name registry.
 */
function pruneRegionsToSelectedModels(
  mechanisms: Record<string, ConfigValue>,
  getModelName: (idStr: string) => string | undefined
): Record<string, ConfigValue> {
  const regions = mechanisms[MECHANISM_REGIONS_KEY];
  if (!isPlainObject(regions)) return mechanisms;

  const selectedIds = collectModelIds(mechanisms[ION_CHANNEL_MODELS_KEY]);

  const removedIds = new Set<string>();
  const nextRegions: Record<string, ConfigValue> = {};

  for (const [regionKey, region] of Object.entries(regions)) {
    if (!isPlainObject(region)) {
      nextRegions[regionKey] = region;
      continue;
    }

    const models = region[ION_CHANNEL_MODELS_KEY];
    if (!Array.isArray(models)) {
      nextRegions[regionKey] = region;
      continue;
    }

    for (const model of models) {
      if (
        isPlainObject(model) &&
        typeof model.id_str === 'string' &&
        !selectedIds.has(model.id_str)
      ) {
        removedIds.add(model.id_str);
      }
    }

    nextRegions[regionKey] = {
      ...region,
      [ION_CHANNEL_MODELS_KEY]: models.filter(
        (model) => isPlainObject(model) && selectedIds.has(model.id_str as string)
      ),
    };
  }

  const withPrunedModels = { ...mechanisms, [MECHANISM_REGIONS_KEY]: nextRegions };

  // Also drop the removed models' parameter entries from every region, resolving their names from
  // the template-scoped registry the panels populated as they resolved these models.
  const removedNames = [...removedIds]
    .map((id) => getModelName(id))
    .filter((name): name is string => Boolean(name));

  return pruneRegionParametersForModelNames(withPrunedModels, removedNames);
}

/**
 * "Mechanism Selection" tab of the E-Model optimisation parameters.
 *
 * Renders the ion channel models multi-picker, scoped to
 * `emodel_optimisation_parameters.mechanisms.ion_channel_models`.
 */
export function MechanismSelection({ rootSchema, value, onChange }: Props) {
  const ionChannelModelsSchema = rootSchema.properties.mechanisms.properties.ion_channel_models;
  const { getModelName } = useModelNameRegistry();

  const root = isPlainObject(value) ? value : {};
  const mechanisms = isPlainObject(root.mechanisms) ? root.mechanisms : {};

  const setMechanismsState = (nextMechanisms: Record<string, ConfigValue>) => {
    // Keep region assignments in sync: a model removed here must also leave every region.
    onChange({ ...root, mechanisms: pruneRegionsToSelectedModels(nextMechanisms, getModelName) });
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2 p-4">
      <ModelIdentifierMultiple
        fieldKey={ION_CHANNEL_MODELS_KEY}
        value={mechanisms[ION_CHANNEL_MODELS_KEY]}
        state={mechanisms}
        setState={setMechanismsState}
        paramSchema={ionChannelModelsSchema}
        // standalone in this tab: show many rows before scrolling instead of the compact default
        visibleItemCount={12}
      />
    </div>
  );
}
