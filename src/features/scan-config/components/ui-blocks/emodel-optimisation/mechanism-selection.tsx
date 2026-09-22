'use client';

import {
  ION_CHANNEL_MODELS_KEY,
  MECHANISMS_KEY,
  pruneRegionsToModelIds,
  readMechanisms,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
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
 * Keeps region assignments consistent with the master `mechanisms.ion_channel_models` list: a model
 * dropped from the master list is removed from every `mechanism_regions.<choice>` entry array,
 * taking its parameters with it. Pruning is purely by `id_str` since each region entry references
 * its model directly.
 */
function pruneRegionsToSelectedModels(
  mechanisms: Record<string, ConfigValue>
): Record<string, ConfigValue> {
  const selectedIds = collectModelIds(mechanisms[ION_CHANNEL_MODELS_KEY]);
  return pruneRegionsToModelIds(mechanisms, selectedIds);
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
  const mechanisms = readMechanisms(value);

  const setMechanismsState = (nextMechanisms: Record<string, ConfigValue>) => {
    // Keep region assignments in sync: a model removed here must also leave every region.
    onChange({ ...root, [MECHANISMS_KEY]: pruneRegionsToSelectedModels(nextMechanisms) });
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
