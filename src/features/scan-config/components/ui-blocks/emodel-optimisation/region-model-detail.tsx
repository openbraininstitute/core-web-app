'use client';

import { useQuery } from '@tanstack/react-query';
import { Checkbox, Radio } from 'antd';
import { useEffect, useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { useModelNameRegistry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/model-name-registry-context';
import { extractNeuronBlockParameters } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/neuron-block-parameters';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ConfigValue } from '@/features/scan-config/types';

const MECHANISM_REGIONS_KEY = 'mechanism_regions';
const PARAMETERS_KEY = 'parameters';

const ParameterMode = {
  Fixed: 'fixed',
  Bounds: 'bounds',
} as const;
type TParameterMode = (typeof ParameterMode)[keyof typeof ParameterMode];

/** A bounds pair; each end may be `null` until the user fills it in. */
type TBounds = [number | null, number | null];

/** Shape stored per checked parameter under `mechanism_regions.<choice>.parameters`. */
type TParameterEntry = {
  mode: TParameterMode;
  value: number | null;
  bounds: TBounds | null;
};

function defaultParameterEntry(): TParameterEntry {
  return { mode: ParameterMode.Fixed, value: null, bounds: null };
}

/** Reads a stored parameter entry into the typed shape, defaulting missing/invalid fields. */
function readParameterEntry(raw: ConfigValue): TParameterEntry {
  if (!isPlainObject(raw)) return defaultParameterEntry();

  const mode = raw.mode === ParameterMode.Bounds ? ParameterMode.Bounds : ParameterMode.Fixed;
  const value = typeof raw.value === 'number' ? raw.value : null;
  const bounds =
    Array.isArray(raw.bounds) && raw.bounds.length === 2
      ? ([
          typeof raw.bounds[0] === 'number' ? raw.bounds[0] : null,
          typeof raw.bounds[1] === 'number' ? raw.bounds[1] : null,
        ] as TBounds)
      : null;

  return { mode, value, bounds };
}

type Props = {
  /** the selected section-list choice `name` (config key under `mechanism_regions`) */
  choiceName: string;
  /** the selected model (`id_str`) whose detail this drawer shows */
  modelId: string;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
};

/**
 * Third column of the Parameters Selection tab: the detail view for a single assigned ion channel
 * model. Fetches the full entity (cached via TanStack Query, keyed by workspace + id) and lists its
 * `neuron_block` parameters, each with a checkbox that toggles an entry in
 * `mechanisms.mechanism_regions.<choiceName>.parameters` keyed `${param}_${modelName}`.
 */
export function RegionModelDetail({ choiceName, modelId, value, onChange }: Props) {
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

  const { registerModelNames } = useModelNameRegistry();

  // Keep the template-scoped registry warm so prune helpers can resolve this model's name by id.
  useEffect(() => {
    if (modelName) registerModelNames([{ id: modelId, name: modelName }]);
  }, [modelId, modelName, registerModelNames]);

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
          modelName={modelName}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}

/**
 * Validates the model's `neuron_block` and lists its flattened `global` + `range` parameters, each
 * with a checkbox. Checking a parameter adds `${param}_${modelName}: {}` to
 * `mechanisms.mechanism_regions.<choiceName>.parameters`; unchecking removes it. Shows an error
 * message when the block is missing or fails validation.
 */
function NeuronBlockParameters({
  neuronBlock,
  choiceName,
  modelName,
  value,
  onChange,
}: {
  neuronBlock: unknown;
  choiceName: string;
  modelName: string;
  value: ConfigValue;
  onChange: (next: ConfigValue) => void;
}) {
  const parameters = extractNeuronBlockParameters(neuronBlock);

  const root = useMemo(() => (isPlainObject(value) ? value : {}), [value]);
  const mechanisms = useMemo(() => (isPlainObject(root.mechanisms) ? root.mechanisms : {}), [root]);
  const regions = useMemo(
    () =>
      isPlainObject(mechanisms[MECHANISM_REGIONS_KEY]) ? mechanisms[MECHANISM_REGIONS_KEY] : {},
    [mechanisms]
  );
  const region = useMemo(
    () => (isPlainObject(regions[choiceName]) ? regions[choiceName] : {}),
    [regions, choiceName]
  );
  const parametersDict = useMemo(
    () => (isPlainObject(region[PARAMETERS_KEY]) ? region[PARAMETERS_KEY] : {}),
    [region]
  );

  const paramKey = (parameterName: string) => `${parameterName}_${modelName}`;

  const writeParameters = (nextParameters: Record<string, ConfigValue>) => {
    onChange({
      ...root,
      mechanisms: {
        ...mechanisms,
        [MECHANISM_REGIONS_KEY]: {
          ...regions,
          [choiceName]: {
            ...region,
            [PARAMETERS_KEY]: nextParameters,
          },
        },
      },
    });
  };

  const toggleParameter = (parameterName: string, checked: boolean) => {
    const nextParameters = { ...parametersDict };
    const key = paramKey(parameterName);

    if (checked) {
      // Check adds the entry, defaulting to `fixed` mode with empty values.
      nextParameters[key] = defaultParameterEntry();
    } else {
      // Uncheck clears everything for this param/model combination.
      delete nextParameters[key];
    }

    writeParameters(nextParameters);
  };

  const setParameterEntry = (parameterName: string, entry: TParameterEntry) => {
    writeParameters({ ...parametersDict, [paramKey(parameterName)]: entry });
  };

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
        const key = paramKey(param.name);
        const checked = key in parametersDict;

        return (
          <ParameterRow
            key={`${param.source}:${param.name}`}
            name={param.name}
            unit={param.unit}
            checked={checked}
            disabled={!modelName}
            entry={checked ? readParameterEntry(parametersDict[key]) : null}
            onToggle={(next) => toggleParameter(param.name, next)}
            onEntryChange={(entry) => setParameterEntry(param.name, entry)}
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
  entry,
  onToggle,
  onEntryChange,
}: {
  name: string;
  unit: string | null;
  checked: boolean;
  disabled: boolean;
  entry: TParameterEntry | null;
  onToggle: (next: boolean) => void;
  onEntryChange: (entry: TParameterEntry) => void;
}) {
  const mode = entry?.mode ?? ParameterMode.Fixed;

  const setMode = (nextMode: TParameterMode) => {
    if (!entry || nextMode === entry.mode) return;
    // Switching mode clears the other mode's field(s). Bounds mode seeds an empty pair so each
    // input can mutate its own slot independently.
    onEntryChange({
      mode: nextMode,
      value: null,
      bounds: nextMode === ParameterMode.Bounds ? [null, null] : null,
    });
  };

  const setValue = (raw: string) => {
    if (!entry) return;
    onEntryChange({ ...entry, value: parseFiniteNumber(raw), bounds: null });
  };

  const setBound = (index: 0 | 1, raw: string) => {
    if (!entry) return;
    const current: TBounds = entry.bounds ?? [null, null];
    const nextBounds: TBounds = [current[0], current[1]];
    nextBounds[index] = parseFiniteNumber(raw);
    onEntryChange({ ...entry, value: null, bounds: nextBounds });
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

      {checked && entry && (
        <div className="flex flex-col gap-2">
          <Radio.Group
            value={mode}
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
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
              placeholder="Value"
              value={entry.value ?? ''}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                placeholder="Min"
                value={entry.bounds?.[0] ?? ''}
                onChange={(e) => setBound(0, e.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                placeholder="Max"
                value={entry.bounds?.[1] ?? ''}
                onChange={(e) => setBound(1, e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
