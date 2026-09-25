/**
 * Read/write helpers for `mechanisms.mechanism_regions`, matching the ObiOne schema:
 *
 *   mechanisms.mechanism_regions.<sectionListName> = MechanismRegionSelection[]
 *
 * where each entry is
 *   {
 *     type: "MechanismRegionSelection",
 *     ion_channel_model: { type: "IonChannelModelFromID", id_str },   // one model per entry
 *     parameters: { "<nmodlVariable>": ParameterSelection }
 *   }
 * and a ParameterSelection is
 *   { type: "ParameterSelection", value: OptimizationValue, distribution: "uniform" }
 * with
 *   OptimizationValue = { mode: "fixed"|"bounds", value: number|null, bounds: [number, number] | null }
 * where the schema requires a `value` in fixed mode, and increasing `bounds` in bounds mode.
 *
 * All the emodel panels go through these helpers so the persisted structure stays schema-valid and
 * the pruning/assignment logic reads/writes the array entries consistently.
 */

import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

import type { ErrorObject } from 'ajv';

export const MECHANISMS_KEY = 'mechanisms';
export const ION_CHANNEL_MODELS_KEY = 'ion_channel_models';
export const MECHANISM_REGIONS_KEY = 'mechanism_regions';
export const PARAMETERS_KEY = 'parameters';

export const IonChannelModelFromIdType = 'IonChannelModelFromID';
export const MechanismRegionSelectionType = 'MechanismRegionSelection';
export const ParameterSelectionType = 'ParameterSelection';
export const DEFAULT_DISTRIBUTION = 'uniform';

export const ParameterMode = {
  Fixed: 'fixed',
  Bounds: 'bounds',
} as const;
export type TParameterMode = (typeof ParameterMode)[keyof typeof ParameterMode];

/** A bounds pair; each end may be `null` until the user fills it in. */
export type TBounds = [number | null, number | null];

/** UI-level view of one parameter's optimization value. */
export type TOptimizationValue = {
  mode: TParameterMode;
  value: number | null;
  bounds: TBounds | null;
};

export function defaultOptimizationValue(): TOptimizationValue {
  return { mode: ParameterMode.Fixed, value: null, bounds: null };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function asRecord(v: ConfigValue): Record<string, ConfigValue> {
  return isPlainObject(v) ? v : {};
}

/** The `mechanisms` object of the emodel config value. */
export function readMechanisms(value: ConfigValue): Record<string, ConfigValue> {
  return asRecord(asRecord(value)[MECHANISMS_KEY]);
}

/** The `mechanism_regions` object (choice name -> entry array). */
export function readRegions(mechanisms: Record<string, ConfigValue>): Record<string, ConfigValue> {
  return asRecord(mechanisms[MECHANISM_REGIONS_KEY]);
}

/** The MechanismRegionSelection entry array for one region choice. */
export function readRegionEntries(
  mechanisms: Record<string, ConfigValue>,
  choiceName: string
): Array<Record<string, ConfigValue>> {
  const region = readRegions(mechanisms)[choiceName];
  if (!Array.isArray(region)) return [];
  return region.filter(isPlainObject);
}

/** The model id (`id_str`) referenced by a region entry, or undefined when malformed. */
export function entryModelId(entry: Record<string, ConfigValue>): string | undefined {
  const model = entry.ion_channel_model;
  if (isPlainObject(model) && typeof model.id_str === 'string') return model.id_str;
  return undefined;
}

/** Ids of models assigned to a region choice, in entry order. */
export function assignedModelIds(
  mechanisms: Record<string, ConfigValue>,
  choiceName: string
): string[] {
  return readRegionEntries(mechanisms, choiceName)
    .map(entryModelId)
    .filter((id): id is string => Boolean(id));
}

/** The `parameters` object of a region entry (nmodl variable name -> ParameterSelection). */
export function entryParameters(entry: Record<string, ConfigValue>): Record<string, ConfigValue> {
  return asRecord(entry[PARAMETERS_KEY]);
}

/** Reads a stored `ParameterSelection.value` (OptimizationValue) into the UI view. */
export function readOptimizationValue(parameterSelection: ConfigValue): TOptimizationValue {
  const selection = asRecord(parameterSelection);
  const optimizationValue = asRecord(selection.value);

  const mode =
    optimizationValue.mode === ParameterMode.Bounds ? ParameterMode.Bounds : ParameterMode.Fixed;
  const value = typeof optimizationValue.value === 'number' ? optimizationValue.value : null;
  const bounds =
    Array.isArray(optimizationValue.bounds) && optimizationValue.bounds.length === 2
      ? ([
          typeof optimizationValue.bounds[0] === 'number' ? optimizationValue.bounds[0] : null,
          typeof optimizationValue.bounds[1] === 'number' ? optimizationValue.bounds[1] : null,
        ] as TBounds)
      : null;

  return { mode, value, bounds };
}

// ---------------------------------------------------------------------------
// Schema errors: ajv errors whose `instancePath` is made relative to the value being rendered
// (the emodel config value, or one parameter's OptimizationValue)
// ---------------------------------------------------------------------------

function isAtOrBelow(instancePath: string, path: string): boolean {
  return instancePath === path || instancePath.startsWith(`${path}/`);
}

/** The errors at or below `path`, with their `instancePath` made relative to it. */
export function errorsUnder(
  errors: readonly ErrorObject[] | null | undefined,
  path: string
): ErrorObject[] {
  return (errors ?? []).flatMap((error) =>
    isAtOrBelow(error.instancePath, path)
      ? [{ ...error, instancePath: error.instancePath.slice(path.length) }]
      : []
  );
}

/** True when `path` or anything below it has an error. */
export function hasErrorAt(errors: readonly ErrorObject[], path: string): boolean {
  return errors.some((error) => isAtOrBelow(error.instancePath, path));
}

/** Path of a region choice's entry array. */
export function regionPath(choiceName: string): string {
  return `/${MECHANISMS_KEY}/${MECHANISM_REGIONS_KEY}/${choiceName}`;
}

/** Matches paths inside a region entry's `parameters`. */
const PARAMETERS_PATH = /^\/mechanisms\/mechanism_regions\/[^/]+\/\d+\/parameters(\/|$)/;

/**
 * The errors inside region entries' `parameters`: the keys the Parameters Selection tab writes, so
 * only that tab flags them.
 */
export function parameterErrors(errors: readonly ErrorObject[]): ErrorObject[] {
  return errors.filter((error) => PARAMETERS_PATH.test(error.instancePath));
}

/** The errors outside region entries' `parameters`, e.g. in the Region Assignment entries. */
export function nonParameterErrors(errors: readonly ErrorObject[]): ErrorObject[] {
  return errors.filter((error) => !PARAMETERS_PATH.test(error.instancePath));
}

/** Ids of the models whose entry in a region has one of `errors`. */
export function failingModelIds(
  mechanisms: Record<string, ConfigValue>,
  choiceName: string,
  errors: readonly ErrorObject[]
): Set<string> {
  const ids = new Set<string>();
  readRegionEntries(mechanisms, choiceName).forEach((entry, index) => {
    const id = entryModelId(entry);
    if (id && hasErrorAt(errors, `${regionPath(choiceName)}/${index}`)) ids.add(id);
  });
  return ids;
}

// ---------------------------------------------------------------------------
// Writes (all return the next `emodel_optimisation_parameters` config value)
// ---------------------------------------------------------------------------

/**
 * Replaces a region choice's entry array, writing back the full emodel value. An empty array
 * removes the region instead: the schema requires at least one model per region.
 */
export function writeRegionEntries(
  value: ConfigValue,
  choiceName: string,
  nextEntries: Array<Record<string, ConfigValue>>
): ConfigValue {
  const root = asRecord(value);
  const mechanisms = readMechanisms(value);
  const regions: Record<string, ConfigValue> = {
    ...readRegions(mechanisms),
    [choiceName]: nextEntries,
  };
  if (nextEntries.length === 0) delete regions[choiceName];

  return {
    ...root,
    [MECHANISMS_KEY]: {
      ...mechanisms,
      [MECHANISM_REGIONS_KEY]: regions,
    },
  };
}

/** A fresh region entry for a model with no parameters selected yet. */
export function makeRegionEntry(idStr: string): Record<string, ConfigValue> {
  return {
    type: MechanismRegionSelectionType,
    ion_channel_model: { type: IonChannelModelFromIdType, id_str: idStr },
    [PARAMETERS_KEY]: {},
  };
}

/** Wraps a UI OptimizationValue into a schema `ParameterSelection`. */
export function makeParameterSelection(optimizationValue: TOptimizationValue): ConfigValue {
  return {
    type: ParameterSelectionType,
    value: optimizationValue,
    distribution: DEFAULT_DISTRIBUTION,
  };
}

// ---------------------------------------------------------------------------
// Pruning (all operate on the whole `mechanisms` object, by model id)
// ---------------------------------------------------------------------------

/**
 * Drops every region entry (across all region choices) whose `ion_channel_model.id_str` is not in
 * `keptIds`. Used when the master `ion_channel_models` list changes: a model removed there must
 * leave every region it was assigned to, taking its parameters with it. A region left without
 * entries is removed: the schema requires at least one model per region.
 *
 * Returns the same `mechanisms` reference when nothing changed.
 */
export function pruneRegionsToModelIds(
  mechanisms: Record<string, ConfigValue>,
  keptIds: ReadonlySet<string>
): Record<string, ConfigValue> {
  const regions = mechanisms[MECHANISM_REGIONS_KEY];
  if (!isPlainObject(regions)) return mechanisms;

  let changed = false;
  const nextRegions: Record<string, ConfigValue> = {};

  for (const [choiceName, entries] of Object.entries(regions)) {
    if (!Array.isArray(entries)) {
      nextRegions[choiceName] = entries;
      continue;
    }

    const kept = entries.filter((entry) => {
      const id = isPlainObject(entry) ? entryModelId(entry) : undefined;
      return id !== undefined && keptIds.has(id);
    });

    if (kept.length !== entries.length) changed = true;
    if (kept.length > 0) nextRegions[choiceName] = kept;
  }

  if (!changed) return mechanisms;
  return { ...mechanisms, [MECHANISM_REGIONS_KEY]: nextRegions };
}

/**
 * `config` with the empty regions dropped from its emodel optimisation value. Unassigning a region's
 * last model leaves the region with an empty entry array, which the schema rejects, so configs saved
 * that way are cleaned when loaded.
 */
export function withoutEmptyRegions(config: Config, schema: ConfigSchema): Config {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      const rootSchema = schema.properties[key];
      const isEModelValue =
        rootSchema !== undefined &&
        !isType(rootSchema) &&
        rootSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters;
      const mechanisms = readMechanisms(value);
      const regions = mechanisms[MECHANISM_REGIONS_KEY];
      if (!isEModelValue || !isPlainObject(regions)) return [key, value];

      const keptRegions = Object.fromEntries(
        Object.entries(regions).filter(
          ([, entries]) => !Array.isArray(entries) || entries.length > 0
        )
      );
      return [
        key,
        {
          ...asRecord(value),
          [MECHANISMS_KEY]: { ...mechanisms, [MECHANISM_REGIONS_KEY]: keptRegions },
        },
      ];
    })
  );
}
