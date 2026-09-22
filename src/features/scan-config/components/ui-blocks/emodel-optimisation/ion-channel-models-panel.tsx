'use client';

import { Checkbox } from 'antd';
import { useMemo } from 'react';

import {
  getAllRefsFromParsed,
  parseModelIdentifierFieldValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

const ION_CHANNEL_MODELS_KEY = 'ion_channel_models';
const MECHANISM_REGIONS_KEY = 'mechanism_regions';

type Props = {
  /** the selected section-list choice `name` (config key under `mechanism_regions`) */
  choiceName: string;
  /** the selected section-list choice label, shown as the panel heading */
  choiceLabel: string;
  /** the `emodel_optimisation_parameters` root element schema (source of the field schema) */
  rootSchema: IEModelOptimisationParameters;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
};

/**
 * Panel that opens beside the Region Assignment cards once a section-list choice is selected.
 *
 * Lists the ion channel models the user picked in "Mechanism Selection" (read from
 * `mechanisms.ion_channel_models`). Checking a model assigns it to the selected region: it is
 * stored under `mechanisms.mechanism_regions.<choiceName>.ion_channel_models` as `{ id_str }`,
 * creating the region entry on first check and dropping it back to an empty list on uncheck.
 */
export function IonChannelModelsPanel({
  choiceName,
  choiceLabel,
  rootSchema,
  value,
  onChange,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const fieldSchema = rootSchema.properties.mechanisms.properties
    .ion_channel_models as unknown as Record<string, unknown>;

  const root = useMemo(() => (isPlainObject(value) ? value : {}), [value]);
  const mechanisms = useMemo(() => (isPlainObject(root.mechanisms) ? root.mechanisms : {}), [root]);

  // Available models to assign: the ones picked in Mechanism Selection.
  const refs = useMemo(() => {
    const parsed = parseModelIdentifierFieldValue(mechanisms[ION_CHANNEL_MODELS_KEY], fieldSchema);
    return getAllRefsFromParsed(parsed);
  }, [mechanisms, fieldSchema]);

  // The set of model ids already assigned to this region, for the checkbox state.
  const assignedIds = useMemo(() => {
    const regions = isPlainObject(mechanisms[MECHANISM_REGIONS_KEY])
      ? mechanisms[MECHANISM_REGIONS_KEY]
      : {};
    const region = isPlainObject(regions[choiceName]) ? regions[choiceName] : {};
    const models = Array.isArray(region[ION_CHANNEL_MODELS_KEY])
      ? region[ION_CHANNEL_MODELS_KEY]
      : [];

    const ids = new Set<string>();
    for (const model of models) {
      if (isPlainObject(model) && typeof model.id_str === 'string') {
        ids.add(model.id_str);
      }
    }
    return ids;
  }, [mechanisms, choiceName]);

  const { entities, isLoading } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const toggleModel = (idStr: string, checked: boolean) => {
    const nextIds = new Set(assignedIds);
    if (checked) {
      nextIds.add(idStr);
    } else {
      nextIds.delete(idStr);
    }

    const regions = isPlainObject(mechanisms[MECHANISM_REGIONS_KEY])
      ? mechanisms[MECHANISM_REGIONS_KEY]
      : {};
    const region = isPlainObject(regions[choiceName]) ? regions[choiceName] : {};

    onChange({
      ...root,
      mechanisms: {
        ...mechanisms,
        [MECHANISM_REGIONS_KEY]: {
          ...regions,
          [choiceName]: {
            ...region,
            [ION_CHANNEL_MODELS_KEY]: [...nextIds].map((id_str) => ({ id_str })),
          },
        },
      },
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto p-4">
      <h3 className="text-primary-9 text-lg font-bold">{choiceLabel}</h3>
      <p className="text-sm text-gray-500">Ion channel models</p>

      {refs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400 italic">
          No ion channel models selected. Add them in the Mechanism Selection tab.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {refs.map((ref) => {
            const entity = entities.find((e) => e.id === ref.id_str);
            const label = entity?.name ?? (isLoading ? 'Loading…' : ref.id_str);

            return (
              <li
                key={ref.id_str}
                className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3"
              >
                <span className="text-primary-8 min-w-0 truncate text-sm font-medium">{label}</span>
                <Checkbox
                  checked={assignedIds.has(ref.id_str)}
                  onChange={(e) => toggleModel(ref.id_str, e.target.checked)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
