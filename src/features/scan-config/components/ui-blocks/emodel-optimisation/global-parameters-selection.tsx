'use client';

import {
  errorsUnder,
  readOptimizationValue,
  type TOptimizationValue,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { ParameterRow } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameter-row';
import { SectionHeader } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/section-header';
import { isPlainObject } from '@/features/scan-config/components/utils';

import type { ErrorObject } from 'ajv';
import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

type Props = {
  /** the `emodel_optimisation_parameters` root element schema (source of the defaults) */
  rootSchema: IEModelOptimisationParameters;
  value: ConfigValue;
  onChange: (next: ConfigValue) => void;
  disabled?: boolean;
  /** ajv errors inside `value` (paths relative to it), to flag the rows that fail */
  errors: readonly ErrorObject[];
};

/**
 * "Global Parameters" tab (step 4) of the E-Model optimisation parameters: the simulation
 * conditions (`v_init`, `celsius`), always present and never removable.
 *
 * Like the backend, uses the schema default of `global_parameters` only while the config has no
 * `global_parameters`; a stored dict is used as is, never merged with the default. The dict is
 * written back in full on every edit, so the default's keys are kept after the first one.
 */
export function GlobalParametersSelection({
  rootSchema,
  value,
  onChange,
  disabled,
  errors,
}: Props) {
  const root = isPlainObject(value) ? value : {};
  const globals = isPlainObject(root.global_parameters)
    ? root.global_parameters
    : rootSchema.properties.global_parameters.default;

  const setGlobal = (key: 'v_init' | 'celsius', next: TOptimizationValue) =>
    onChange({
      ...root,
      global_parameters: {
        ...globals,
        [key]: { type: 'GlobalParameterSelection', value: next },
      },
    });

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-4 p-4">
      <SectionHeader
        title="Global parameters"
        description="Simulation conditions, set once for the whole simulation."
      />

      <ul className="flex flex-col gap-2">
        <ParameterRow
          name="Initial membrane potential"
          unit="mV"
          checked
          disabled={disabled}
          errors={errorsUnder(errors, '/global_parameters/v_init/value')}
          optimizationValue={readOptimizationValue(globals.v_init)}
          onValueChange={(next) => setGlobal('v_init', next)}
        />
        <ParameterRow
          name="Temperature"
          unit="°C"
          checked
          disabled={disabled}
          errors={errorsUnder(errors, '/global_parameters/celsius/value')}
          optimizationValue={readOptimizationValue(globals.celsius)}
          onValueChange={(next) => setGlobal('celsius', next)}
        />
      </ul>
    </div>
  );
}
