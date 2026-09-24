/**
 * Read/write helpers for `global_parameters` (step 4 of the Mechanisms workflow), matching the
 * ObiOne schema:
 *
 *   global_parameters.<key> = { type: "GlobalParameterSelection", value: OptimizationValue }
 *
 * The UI only edits the simulation conditions (`v_init`, `celsius`): bare keys, no
 * `ion_channel_model`, always present. Any other entry already in the dict is kept as is.
 *
 * Unlike region parameters, entries carry no `distribution`.
 */

import {
  asRecord,
  makeOptimizationValue,
  ParameterMode,
  type TOptimizationValue,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { ConfigValue } from '@/features/scan-config/types';

export const GLOBAL_PARAMETERS_KEY = 'global_parameters';
export const GlobalParameterSelectionType = 'GlobalParameterSelection';

/** Simulation conditions: NEURON's own globals, one value for the whole run. */
export const SIMULATION_CONDITIONS = [
  { key: 'v_init', label: 'Initial membrane potential', unit: 'mV', defaultValue: -80 },
  { key: 'celsius', label: 'Temperature', unit: '°C', defaultValue: 34 },
] as const;

export const CELSIUS_KEY = 'celsius';

/**
 * The `global_parameters` dict, with any missing simulation condition filled with its default.
 * Both are always present in the UI; the fill only matters before the dict is first written.
 */
export function readGlobalParameters(value: ConfigValue): Record<string, ConfigValue> {
  const stored = asRecord(asRecord(value)[GLOBAL_PARAMETERS_KEY]);

  const defaults = Object.fromEntries(
    SIMULATION_CONDITIONS.filter(({ key }) => !(key in stored)).map(({ key, defaultValue }) => [
      key,
      makeGlobalParameterSelection({
        mode: ParameterMode.Fixed,
        value: defaultValue,
        bounds: null,
      }),
    ])
  );

  return { ...defaults, ...stored };
}

/** Replaces the `global_parameters` dict, writing back the full emodel value. */
export function writeGlobalParameters(
  value: ConfigValue,
  nextGlobals: Record<string, ConfigValue>
): ConfigValue {
  return { ...asRecord(value), [GLOBAL_PARAMETERS_KEY]: nextGlobals };
}

/** Wraps a UI OptimizationValue into a schema `GlobalParameterSelection`. */
export function makeGlobalParameterSelection(optimizationValue: TOptimizationValue): ConfigValue {
  return {
    type: GlobalParameterSelectionType,
    value: makeOptimizationValue(optimizationValue),
  };
}
