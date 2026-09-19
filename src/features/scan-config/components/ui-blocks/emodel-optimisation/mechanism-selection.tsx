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

/**
 * "Mechanism Selection" tab of the E-Model optimisation parameters.
 *
 * Renders the ion channel models multi-picker, scoped to
 * `emodel_optimisation_parameters.mechanisms.ion_channel_models`. The field schema is read
 * straight from `rootSchema` (the backend sets its `ui_element` + shape) — no duplication.
 */
export function MechanismSelection({ rootSchema, value, onChange }: Props) {
  const ionChannelModelsSchema = rootSchema.properties.mechanisms.properties.ion_channel_models;

  const root = isPlainObject(value) ? value : {};
  const mechanisms = isPlainObject(root.mechanisms) ? root.mechanisms : {};

  const setMechanismsState = (nextMechanisms: Record<string, ConfigValue>) => {
    onChange({ ...root, mechanisms: nextMechanisms });
  };

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <ModelIdentifierMultiple
        fieldKey={ION_CHANNEL_MODELS_KEY}
        value={mechanisms[ION_CHANNEL_MODELS_KEY]}
        state={mechanisms}
        setState={setMechanismsState}
        paramSchema={ionChannelModelsSchema}
      />
    </div>
  );
}
