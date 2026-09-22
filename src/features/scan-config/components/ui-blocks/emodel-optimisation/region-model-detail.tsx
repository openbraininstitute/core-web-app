'use client';

import { useQuery } from '@tanstack/react-query';
import { Checkbox } from 'antd';
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

  const toggleParameter = (parameterName: string, checked: boolean) => {
    const nextParameters = { ...parametersDict };
    const key = paramKey(parameterName);

    if (checked) {
      nextParameters[key] = {};
    } else {
      delete nextParameters[key];
    }

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
      {parameters.map((param) => (
        <li
          key={`${param.source}:${param.name}`}
          className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3"
        >
          <span className="text-primary-8 min-w-0 truncate text-sm font-medium">{param.name}</span>
          <div className="flex shrink-0 items-center gap-3">
            {param.unit && <span className="text-xs text-gray-500">{param.unit}</span>}
            <Checkbox
              checked={paramKey(param.name) in parametersDict}
              disabled={!modelName}
              onChange={(e) => toggleParameter(param.name, e.target.checked)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
