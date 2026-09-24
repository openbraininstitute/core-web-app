'use client';

import { RiArrowRightSLine } from '@remixicon/react';
import { useMemo } from 'react';

import {
  assignedModelIds,
  ION_CHANNEL_MODELS_KEY,
  IonChannelModelFromIdType,
  readMechanisms,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { ConfigValue } from '@/features/scan-config/types';

type Props = {
  /** the selected section-list choice `name` (config key under `mechanism_regions`) */
  choiceName: string;
  /** the selected section-list choice label, shown as the panel heading */
  choiceLabel: string;
  /** the selected section-list choice description, shown under the heading */
  choiceDescription: string;
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
 * Lists only the ion channel models already assigned to the selected region (read from the
 * `mechanisms.mechanism_regions.<choiceName>` entry array). Each row carries a chevron that selects
 * the model and opens the third detail drawer.
 */
export function RegionModelsPanel({
  choiceName,
  choiceLabel,
  choiceDescription,
  value,
  selectedRegionModel,
  setSelectedRegionModel,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const mechanisms = useMemo(() => readMechanisms(value), [value]);

  // The ids assigned to this region (the subset we actually display).
  const assignedIds = useMemo(
    () => assignedModelIds(mechanisms, choiceName),
    [mechanisms, choiceName]
  );

  // Resolve names off the *full* picked list (`mechanisms.ion_channel_models`), not this region's
  // subset. Mechanism Selection already resolved that exact list, so this hits the shared query
  // cache instead of firing a fresh, narrower request (which flashed "Loading…").
  const refs = useMemo<TFromIdRef[]>(() => {
    const picked = Array.isArray(mechanisms[ION_CHANNEL_MODELS_KEY])
      ? mechanisms[ION_CHANNEL_MODELS_KEY]
      : [];

    return picked.flatMap((model) =>
      isPlainObject(model) && typeof model.id_str === 'string'
        ? [{ type: IonChannelModelFromIdType, id_str: model.id_str }]
        : []
    );
  }, [mechanisms]);

  const { entities, isLoading } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto p-4">
      <h3 className="text-primary-9 text-lg font-bold">{choiceLabel}</h3>
      <p className="text-sm text-gray-500">{choiceDescription || 'Assigned ion channel models'}</p>

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
                    isSelected && 'border-primary-8 bg-primary-8 shadow-xs'
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 truncate text-sm font-medium',
                      isSelected ? 'text-white' : 'text-primary-8'
                    )}
                  >
                    {label}
                  </span>
                  {/* points to the side the drawer opens on, so it doesn't rotate when open */}
                  <RiArrowRightSLine
                    aria-hidden
                    className={cn('size-5 shrink-0', isSelected ? 'text-white' : 'text-gray-400')}
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
