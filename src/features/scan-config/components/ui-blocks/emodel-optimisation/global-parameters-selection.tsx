'use client';

import {
  asRecord,
  readOptimizationValue,
  type TOptimizationValue,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { ParameterRow } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/parameter-row';
import { SectionHeader } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/section-header';

import type { ConfigValue } from '@/features/scan-config/types';

/**
 * Schema default of `global_parameters`. Stored entries override it, and the merged dict is written
 * back in full on every edit, so neither key goes missing.
 */
const DEFAULT_GLOBAL_PARAMETERS: Record<string, ConfigValue> = {
  v_init: { type: 'GlobalParameterSelection', value: { mode: 'fixed', value: -80, bounds: null } },
  celsius: { type: 'GlobalParameterSelection', value: { mode: 'fixed', value: 34, bounds: null } },
};

type Props = {
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** read-only mode: disables the mode radios and value inputs */
  disabled?: boolean;
};

/**
 * "Global Parameters" tab (step 4) of the E-Model optimisation parameters: the simulation
 * conditions (`v_init`, `celsius`), always present and never removable. Any other entry already in
 * `global_parameters` is kept as is.
 */
export function GlobalParametersSelection({ value, onChange, disabled }: Props) {
  const root = asRecord(value);
  const globals = { ...DEFAULT_GLOBAL_PARAMETERS, ...asRecord(root.global_parameters) };

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
          optimizationValue={readOptimizationValue(globals.v_init)}
          onValueChange={(next) => setGlobal('v_init', next)}
        />
        <ParameterRow
          name="Temperature"
          unit="°C"
          checked
          disabled={disabled}
          optimizationValue={readOptimizationValue(globals.celsius)}
          onValueChange={(next) => setGlobal('celsius', next)}
        />
      </ul>
    </div>
  );
}
