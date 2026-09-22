'use client';

import { Checkbox } from 'antd';
import { useMemo } from 'react';

import {
  assignedModelIds,
  entryModelId,
  ION_CHANNEL_MODELS_KEY,
  makeRegionEntry,
  readMechanisms,
  readRegionEntries,
  writeRegionEntries,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import {
  getAllRefsFromParsed,
  parseModelIdentifierFieldValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

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
 * `mechanisms.ion_channel_models`). Checking a model assigns it to the selected region by adding a
 * `MechanismRegionSelection` entry to `mechanisms.mechanism_regions.<choiceName>` (an array);
 * unchecking removes that entry (and, with it, any parameters it held).
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

  const mechanisms = useMemo(() => readMechanisms(value), [value]);

  // Available models to assign: the ones picked in Mechanism Selection.
  const refs = useMemo(() => {
    const parsed = parseModelIdentifierFieldValue(mechanisms[ION_CHANNEL_MODELS_KEY], fieldSchema);
    return getAllRefsFromParsed(parsed);
  }, [mechanisms, fieldSchema]);

  // Ids already assigned to this region, for the checkbox state.
  const assignedIds = useMemo(
    () => new Set(assignedModelIds(mechanisms, choiceName)),
    [mechanisms, choiceName]
  );

  const { entities, isLoading } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const toggleModel = (idStr: string, checked: boolean) => {
    const entries = readRegionEntries(mechanisms, choiceName);

    const nextEntries = checked
      ? // assign: add an entry for this model if not already present
        entries.some((entry) => entryModelId(entry) === idStr)
        ? entries
        : [...entries, makeRegionEntry(idStr)]
      : // unassign: drop this model's entry, taking any parameters it held with it
        entries.filter((entry) => entryModelId(entry) !== idStr);

    onChange(writeRegionEntries(value, choiceName, nextEntries));
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
