'use client';

import { RiArrowRightSLine } from '@remixicon/react';
import { useEffect, useMemo } from 'react';

import { useModelNameRegistry } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/model-name-registry-context';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { ConfigValue } from '@/features/scan-config/types';

const ION_CHANNEL_MODELS_KEY = 'ion_channel_models';
const MECHANISM_REGIONS_KEY = 'mechanism_regions';

type Props = {
  /** the selected section-list choice `name` (config key under `mechanism_regions`) */
  choiceName: string;
  /** the selected section-list choice label, shown as the panel heading */
  choiceLabel: string;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** currently selected model (`id_str`), or '' when none is selected */
  selectedRegionModel: string;
  /** selects a model, opening the adjacent detail drawer; reselecting the open one closes it */
  setSelectedRegionModel: (idStr: string) => void;
};

/**
 * Second column of the Parameters Selection tab.
 *
 * Lists only the ion channel models already assigned to the selected region (read from
 * `mechanisms.mechanism_regions.<choiceName>.ion_channel_models`). Each row carries a chevron that
 * selects the model and opens the third detail drawer.
 */
export function RegionModelsPanel({
  choiceName,
  choiceLabel,
  value,
  selectedRegionModel,
  setSelectedRegionModel,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const mechanisms = useMemo(() => {
    const root = isPlainObject(value) ? value : {};
    return isPlainObject(root.mechanisms) ? root.mechanisms : {};
  }, [value]);

  // The ids assigned to this region (the subset we actually display).
  const assignedIds = useMemo(() => {
    const regions = isPlainObject(mechanisms[MECHANISM_REGIONS_KEY])
      ? mechanisms[MECHANISM_REGIONS_KEY]
      : {};
    const region = isPlainObject(regions[choiceName]) ? regions[choiceName] : {};
    const models = Array.isArray(region[ION_CHANNEL_MODELS_KEY])
      ? region[ION_CHANNEL_MODELS_KEY]
      : [];

    const ids: string[] = [];
    for (const model of models) {
      if (isPlainObject(model) && typeof model.id_str === 'string') {
        ids.push(model.id_str);
      }
    }
    return ids;
  }, [mechanisms, choiceName]);

  // Resolve names off the *full* picked list (`mechanisms.ion_channel_models`), not this region's
  // subset. Mechanism Selection already resolved that exact list, so this hits the shared query
  // cache instead of firing a fresh, narrower request (which flashed "Loading…"). We only need
  // names here — no per-region fetch is warranted.
  const refs = useMemo<TFromIdRef[]>(() => {
    const picked = Array.isArray(mechanisms[ION_CHANNEL_MODELS_KEY])
      ? mechanisms[ION_CHANNEL_MODELS_KEY]
      : [];

    return picked.flatMap((model) =>
      isPlainObject(model) && typeof model.id_str === 'string'
        ? [{ type: 'IonChannelModelFromID', id_str: model.id_str }]
        : []
    );
  }, [mechanisms]);

  const { entities, isLoading } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const { registerModelNames } = useModelNameRegistry();

  // Keep the template-scoped registry warm so prune helpers can resolve names by id.
  useEffect(() => {
    registerModelNames(entities);
  }, [entities, registerModelNames]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto p-4">
      <h3 className="text-primary-9 text-lg font-bold">{choiceLabel}</h3>
      <p className="text-sm text-gray-500">Assigned ion channel models</p>

      {assignedIds.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400 italic">
          No ion channel models assigned to this region. Assign them in the Region Assignment tab.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {assignedIds.map((idStr) => {
            const entity = entities.find((e) => e.id === idStr);
            const label = entity?.name ?? (isLoading ? 'Loading…' : idStr);
            const isSelected = idStr === selectedRegionModel;

            return (
              <li key={idStr}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-expanded={isSelected}
                  // toggle: reselecting the open model closes the detail drawer
                  onClick={() => setSelectedRegionModel(isSelected ? '' : idStr)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3',
                    'cursor-pointer text-left hover:shadow-xs',
                    isSelected && 'border-primary-8 shadow-xs'
                  )}
                >
                  <span className="text-primary-8 min-w-0 truncate text-sm font-medium">
                    {label}
                  </span>
                  <RiArrowRightSLine
                    aria-hidden
                    className={cn(
                      'size-5 shrink-0 text-gray-400 transition-transform duration-300',
                      isSelected && 'rotate-90 text-primary-8'
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
