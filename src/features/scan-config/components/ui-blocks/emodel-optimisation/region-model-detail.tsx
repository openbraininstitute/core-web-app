'use client';

import { useQuery } from '@tanstack/react-query';
import { Checkbox, Radio } from 'antd';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import {
  defaultOptimizationValue,
  entryModelId,
  entryParameters,
  makeParameterSelection,
  PARAMETERS_KEY,
  ParameterMode,
  readMechanisms,
  readOptimizationValue,
  readRegionEntries,
  type TBounds,
  type TOptimizationValue,
  type TParameterMode,
  writeRegionEntries,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { extractNeuronBlockParameters } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/neuron-block-parameters';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ConfigValue } from '@/features/scan-config/types';

type Props = {
  /** the selected section-list choice `name` (config key under `mechanism_regions`) */
  choiceName: string;
  /** the selected model (`id_str`) whose detail this drawer shows */
  modelId: string;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** read-only mode: disables the parameter checkboxes, mode radios and value inputs */
  disabled?: boolean;
};

/**
 * Third column of the Parameters Selection tab: the detail view for a single assigned ion channel
 * model. Fetches the full entity (cached via TanStack Query, keyed by workspace + id) and lists its
 * `neuron_block` parameters. Each parameter maps to an entry in the model's `parameters` object on
 * its `MechanismRegionSelection` entry in `mechanisms.mechanism_regions.<choiceName>`.
 */
export function RegionModelDetail({ choiceName, modelId, value, onChange, disabled }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const {
    data: model,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: keyBuilder.entity({
      context,
      id: modelId,
      type: ExtendedEntitiesTypeDict.IonChannelModel,
    }),
    queryFn: () =>
      retrieveEntity({ type: ExtendedEntitiesTypeDict.IonChannelModel, id: modelId, ctx: context }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(modelId),
  });

  const modelName = isPlainObject(model) && typeof model.name === 'string' ? model.name : '';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto p-4">
      <h3 className="text-primary-9 text-lg font-bold">
        {isPending ? 'Loading…' : modelName || 'Ion channel model'}
      </h3>
      <p className="text-sm text-gray-500">Ion channel model</p>

      {isError ? (
        <p className="mt-2 text-sm text-red-500">
          {error instanceof Error ? error.message : 'Failed to load ion channel model.'}
        </p>
      ) : isPending ? (
        <p className="mt-2 text-sm text-gray-400 italic">Loading ion channel model…</p>
      ) : (
        <NeuronBlockParameters
          neuronBlock={isPlainObject(model) ? model.neuron_block : undefined}
          choiceName={choiceName}
          modelId={modelId}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

/**
 * Validates the model's `neuron_block` and lists its flattened `global` + `range` parameters, each
 * with a checkbox. Checking a parameter adds it (keyed by its bare NMODL name) to the model's
 * `parameters` object on its region entry; unchecking removes it. Shows an error message when the
 * block is missing or fails validation.
 */
function NeuronBlockParameters({
  neuronBlock,
  choiceName,
  modelId,
  value,
  onChange,
  disabled,
}: {
  neuronBlock: unknown;
  choiceName: string;
  modelId: string;
  value: ConfigValue;
  onChange: (next: ConfigValue) => void;
  disabled?: boolean;
}) {
  const parameters = extractNeuronBlockParameters(neuronBlock);

  // The region entries and the index of this model's entry within them.
  const entries = useMemo(
    () => readRegionEntries(readMechanisms(value), choiceName),
    [value, choiceName]
  );
  const entryIndex = useMemo(
    () => entries.findIndex((entry) => entryModelId(entry) === modelId),
    [entries, modelId]
  );
  const parametersDict = useMemo(
    () => (entryIndex >= 0 ? entryParameters(entries[entryIndex]) : {}),
    [entries, entryIndex]
  );

  // Writes the model's parameters object back onto its region entry.
  const writeParameters = (nextParameters: Record<string, ConfigValue>) => {
    if (entryIndex < 0) return;
    const nextEntries = entries.map((entry, index) =>
      index === entryIndex ? { ...entry, [PARAMETERS_KEY]: nextParameters } : entry
    );
    onChange(writeRegionEntries(value, choiceName, nextEntries));
  };

  const toggleParameter = (parameterName: string, checked: boolean) => {
    const next = { ...parametersDict };
    if (checked) {
      // Check adds the parameter, defaulting to a `fixed` OptimizationValue with empty values.
      next[parameterName] = makeParameterSelection(defaultOptimizationValue());
    } else {
      // Uncheck clears everything for this parameter.
      delete next[parameterName];
    }
    writeParameters(next);
  };

  const setParameterValue = (parameterName: string, optimizationValue: TOptimizationValue) => {
    writeParameters({
      ...parametersDict,
      [parameterName]: makeParameterSelection(optimizationValue),
    });
  };

  if (entryIndex < 0) {
    // The model isn't assigned to this region (e.g. just unassigned) — nothing to configure.
    return (
      <p className="mt-2 text-sm text-gray-400 italic">This model is not assigned to the region.</p>
    );
  }

  if (parameters === null) {
    return (
      <p className="mt-2 text-sm text-red-500">Parameters not found for this ion channel model</p>
    );
  }

  if (parameters.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-400 italic">No parameters for this ion channel model.</p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {parameters.map((param) => {
        const checked = param.name in parametersDict;

        return (
          <ParameterRow
            key={`${param.source}:${param.name}`}
            name={param.name}
            unit={param.unit}
            checked={checked}
            disabled={disabled}
            optimizationValue={checked ? readOptimizationValue(parametersDict[param.name]) : null}
            onToggle={(next) => toggleParameter(param.name, next)}
            onValueChange={(next) => setParameterValue(param.name, next)}
          />
        );
      })}
    </ul>
  );
}

/** True when the string parses to a finite number. Empty input is treated as "not yet a value". */
function parseFiniteNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * A single parameter row: a checkbox to include the parameter, and — once checked — a fixed/bounds
 * mode selector with the matching number input(s). Switching mode clears the other mode's field(s).
 */
function ParameterRow({
  name,
  unit,
  checked,
  disabled,
  optimizationValue,
  onToggle,
  onValueChange,
}: {
  name: string;
  unit: string | null;
  checked: boolean;
  disabled?: boolean;
  optimizationValue: TOptimizationValue | null;
  onToggle: (next: boolean) => void;
  onValueChange: (next: TOptimizationValue) => void;
}) {
  const mode = optimizationValue?.mode ?? ParameterMode.Fixed;

  const setMode = (nextMode: TParameterMode) => {
    if (!optimizationValue || nextMode === optimizationValue.mode) return;
    // Switching mode clears the other mode's field(s). Bounds mode seeds an empty pair so each
    // input can mutate its own slot independently.
    onValueChange({
      mode: nextMode,
      value: null,
      bounds: nextMode === ParameterMode.Bounds ? [null, null] : null,
    });
  };

  const setValue = (raw: string) => {
    if (!optimizationValue) return;
    onValueChange({ ...optimizationValue, value: parseFiniteNumber(raw), bounds: null });
  };

  const setBound = (index: 0 | 1, raw: string) => {
    if (!optimizationValue) return;
    const current: TBounds = optimizationValue.bounds ?? [null, null];
    const nextBounds: TBounds = [current[0], current[1]];
    nextBounds[index] = parseFiniteNumber(raw);
    onValueChange({ ...optimizationValue, value: null, bounds: nextBounds });
  };

  return (
    <li className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-primary-8 min-w-0 truncate text-sm font-medium">{name}</span>
        <div className="flex shrink-0 items-center gap-3">
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
        </div>
      </div>

      {checked && optimizationValue && (
        <div className="flex flex-col gap-2">
          <Radio.Group
            value={mode}
            disabled={disabled}
            onChange={(e) => setMode(e.target.value as TParameterMode)}
            options={[
              { label: 'Fixed', value: ParameterMode.Fixed },
              { label: 'Bounds', value: ParameterMode.Bounds },
            ]}
          />

          {mode === ParameterMode.Fixed ? (
            <input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Value"
              value={optimizationValue.value ?? ''}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                disabled={disabled}
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Min"
                value={optimizationValue.bounds?.[0] ?? ''}
                onChange={(e) => setBound(0, e.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                disabled={disabled}
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Max"
                value={optimizationValue.bounds?.[1] ?? ''}
                onChange={(e) => setBound(1, e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
