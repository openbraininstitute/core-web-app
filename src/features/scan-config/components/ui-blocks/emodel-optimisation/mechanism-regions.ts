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
 *   OptimizationValue = { type: "OptimizationValue", mode: "fixed"|"bounds", value: number|null,
 *                         bounds: [number, number] | null }
 *
 * All the emodel panels go through these helpers so the persisted structure stays schema-valid and
 * the pruning/assignment logic reads/writes the array entries consistently.
 */

import { isPlainObject } from '@/features/scan-config/components/utils';

import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { ConfigValue } from '@/features/scan-config/types';

export const MECHANISMS_KEY = 'mechanisms';
export const ION_CHANNEL_MODELS_KEY = 'ion_channel_models';
export const MECHANISM_REGIONS_KEY = 'mechanism_regions';
export const PARAMETERS_KEY = 'parameters';

export const IonChannelModelFromIdType = 'IonChannelModelFromID';
export const MechanismRegionSelectionType = 'MechanismRegionSelection';
export const ParameterSelectionType = 'ParameterSelection';
export const OptimizationValueType = 'OptimizationValue';
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

export function asRecord(v: ConfigValue): Record<string, ConfigValue> {
  return isPlainObject(v) ? v : {};
}

/** The `mechanisms` object of the emodel config value. */
export function readMechanisms(value: ConfigValue): Record<string, ConfigValue> {
  return asRecord(asRecord(value)[MECHANISMS_KEY]);
}

/** Refs of the models picked in Mechanism Selection (`ion_channel_models`), in picked order. */
export function pickedModelRefs(mechanisms: Record<string, ConfigValue>): TFromIdRef[] {
  const picked = mechanisms[ION_CHANNEL_MODELS_KEY];
  if (!Array.isArray(picked)) return [];

  return picked.flatMap((model) =>
    isPlainObject(model) && typeof model.id_str === 'string'
      ? [{ type: IonChannelModelFromIdType, id_str: model.id_str }]
      : []
  );
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

/** Ids of models assigned to at least one region choice. */
export function modelIdsAssignedToAnyRegion(mechanisms: Record<string, ConfigValue>): Set<string> {
  return new Set(
    Object.keys(readRegions(mechanisms)).flatMap((choiceName) =>
      assignedModelIds(mechanisms, choiceName)
    )
  );
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
// Writes (all return the next `emodel_optimisation_parameters` config value)
// ---------------------------------------------------------------------------

/** Replaces a region choice's entry array, writing back the full emodel value. */
export function writeRegionEntries(
  value: ConfigValue,
  choiceName: string,
  nextEntries: Array<Record<string, ConfigValue>>
): ConfigValue {
  const root = asRecord(value);
  const mechanisms = readMechanisms(value);
  const regions = readRegions(mechanisms);

  return {
    ...root,
    [MECHANISMS_KEY]: {
      ...mechanisms,
      [MECHANISM_REGIONS_KEY]: {
        ...regions,
        [choiceName]: nextEntries,
      },
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

/** Wraps a UI OptimizationValue into a schema `OptimizationValue`. */
export function makeOptimizationValue(optimizationValue: TOptimizationValue): ConfigValue {
  return {
    type: OptimizationValueType,
    mode: optimizationValue.mode,
    value: optimizationValue.value,
    bounds: optimizationValue.bounds,
  };
}

/** Wraps a UI OptimizationValue into a schema `ParameterSelection`. */
export function makeParameterSelection(optimizationValue: TOptimizationValue): ConfigValue {
  return {
    type: ParameterSelectionType,
    value: makeOptimizationValue(optimizationValue),
    distribution: DEFAULT_DISTRIBUTION,
  };
}

// ---------------------------------------------------------------------------
// Pruning (all operate on the whole `mechanisms` object, by model id)
// ---------------------------------------------------------------------------

/**
 * Drops every region entry (across all region choices) whose `ion_channel_model.id_str` is not in
 * `keptIds`. Used when the master `ion_channel_models` list changes: a model removed there must
 * leave every region it was assigned to, taking its parameters with it.
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
    nextRegions[choiceName] = kept;
  }

  if (!changed) return mechanisms;
  return { ...mechanisms, [MECHANISM_REGIONS_KEY]: nextRegions };
}
