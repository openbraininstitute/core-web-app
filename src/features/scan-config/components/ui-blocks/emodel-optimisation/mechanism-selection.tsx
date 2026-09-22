'use client';

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
 * Drops any region-assigned model whose `id_str` is no longer in the master
 * `mechanisms.ion_channel_models` list, so removing a model in this tab also removes it from every
 * `mechanism_regions.*.ion_channel_models` that referenced it. Regions are otherwise left intact.
 */
function pruneRegionsToSelectedModels(
  mechanisms: Record<string, ConfigValue>
): Record<string, ConfigValue> {
  const regions = mechanisms[MECHANISM_REGIONS_KEY];
  if (!isPlainObject(regions)) return mechanisms;

  const selectedIds = collectModelIds(mechanisms[ION_CHANNEL_MODELS_KEY]);

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

    nextRegions[regionKey] = {
      ...region,
      [ION_CHANNEL_MODELS_KEY]: models.filter(
        (model) => isPlainObject(model) && selectedIds.has(model.id_str as string)
      ),
    };
  }

  return { ...mechanisms, [MECHANISM_REGIONS_KEY]: nextRegions };
}

/**
 * "Mechanism Selection" tab of the E-Model optimisation parameters.
 *
 * Renders the ion channel models multi-picker, scoped to
 * `emodel_optimisation_parameters.mechanisms.ion_channel_models`.
 */
export function MechanismSelection({ rootSchema, value, onChange }: Props) {
  const ionChannelModelsSchema = rootSchema.properties.mechanisms.properties.ion_channel_models;

  const root = isPlainObject(value) ? value : {};
  const mechanisms = isPlainObject(root.mechanisms) ? root.mechanisms : {};

  const setMechanismsState = (nextMechanisms: Record<string, ConfigValue>) => {
    // Keep region assignments in sync: a model removed here must also leave every region.
    onChange({ ...root, mechanisms: pruneRegionsToSelectedModels(nextMechanisms) });
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
