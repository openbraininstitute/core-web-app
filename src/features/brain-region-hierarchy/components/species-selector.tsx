'use client';

import { RiArrowDownSLine, RiCheckboxCircleFill } from '@remixicon/react';
import { useAtomValue } from 'jotai';

import {
  AllSpeciesDisplayName,
  allowAllSpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import {
  useAvailableHierarchySpeciesQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
  useWorkspaceHierarchyRegistry,
} from '@/features/brain-region-hierarchy/hooks';
import {
  type IWorkspaceSpecies,
  SPECIES_DISPLAY_NAMES,
  SPECIES_SUBTITLES,
  SpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/molecules/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

/**
 * value emitted by the dropdown when the user picks "All":
 * the literal from SPECIES_SELECTION_MODE (`'all'`).
 */
type SpeciesSelectorValue = string | typeof SpeciesSelectionMode.All;

interface SpeciesSelectorProps {
  selectedSpecies: IWorkspaceSpecies | null;
  onSpeciesChange: (hierarchyIdOrMode: SpeciesSelectorValue) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * species selector dropdown for brain region hierarchy
 *
 * displays available species with their common names (e.g., "Human", "Mouse")
 * and scientific names in the dropdown options.
 */
export function SpeciesSelector({
  selectedSpecies,
  onSpeciesChange,
  disabled = false,
  className,
}: SpeciesSelectorProps) {
  const {
    remoteAvailableHierarchies,
    loading: isLoadingAvailableHierarchySpecies,
    error,
  } = useAvailableHierarchySpeciesQuery();

  const { loading: isLoadingRemoteUserPreferenceHierarchySpecies } =
    useRemoteUserPreferenceHierarchySpeciesQuery();

  const { syncSettled, speciesSelectionMode } = useWorkspaceHierarchyRegistry();
  const allowAllSpecies = useAtomValue(allowAllSpeciesAtom);

  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;
  if (
    isLoadingAvailableHierarchySpecies ||
    isLoadingRemoteUserPreferenceHierarchySpecies ||
    !syncSettled
  ) {
    return (
      <div className={cn('flex items-center gap-2 py-2', className)}>
        <span className="text-neutral-5 text-sm">Species</span>
        <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
      </div>
    );
  }

  if (error || remoteAvailableHierarchies?.length === 0) {
    return null;
  }

  const speciesOrder = Object.keys(SPECIES_DISPLAY_NAMES);

  const options = remoteAvailableHierarchies
    ?.map((h) => ({
      ...h.species,
      hierarchId: h.id,
    }))
    .sort((a, b) => {
      const indexA = speciesOrder.indexOf(a.name);
      const indexB = speciesOrder.indexOf(b.name);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });

  const currentValue = isAllMode ? SpeciesSelectionMode.All : selectedSpecies?.hierarchId || '';
  const triggerLabel = isAllMode ? AllSpeciesDisplayName : selectedSpecies?.displayName;

  return (
    <span id="species-selector" className={cn('flex w-full min-w-0 items-center py-2', className)}>
      <Select value={currentValue} onValueChange={onSpeciesChange} disabled={disabled}>
        <SelectTrigger
          size="sm"
          className={cn(
            'h-auto min-h-8 gap-1 rounded-full border-none bg-transparent px-0 py-1 shadow-none',
            'focus:ring-0 focus-visible:ring-0',
            'transition-colors duration-150',
            isAllMode ? 'w-full cursor-pointer justify-between' : 'w-full min-w-0 cursor-pointer'
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          icon={<RiArrowDownSLine className="size-5.5 text-primary-8" />}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <span className="text-neutral-5 shrink-0 text-base font-normal">Species</span>
            {triggerLabel ? (
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <span className="text-primary-9 block h-6 w-full min-w-0 flex-1 truncate text-base leading-6 font-bold">
                    {triggerLabel}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="top"
                  sideOffset={0}
                  className="bg-white shadow-bnb text-primary-8 border-gray-200"
                  arrowClassName="bg-white"
                >
                  {triggerLabel}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
            )}
          </div>
        </SelectTrigger>
        <SelectContent
          className="min-w-50 max-h-80 z-9999 bg-white border-background"
          position="popper"
          sideOffset={6}
          alignOffset={0}
          align="start"
        >
          {allowAllSpecies && (
            <SelectItem
              id="species-selector-options"
              key={SpeciesSelectionMode.All}
              value={SpeciesSelectionMode.All}
              className={cn('cursor-pointer py-2.5 px-3', '[&_.select-icon-wrapper]:top-4')}
              checkIconClassName="text-primary-8 size-5 ite"
              checkIcon={<RiCheckboxCircleFill className="text-primary-8" />}
            >
              <div className="flex flex-col">
                <span
                  className={cn('text-base font-medium text-primary-8', {
                    'font-bold': isAllMode,
                  })}
                >
                  All
                </span>
                <span className="text-xs text-gray-400">All species</span>
              </div>
            </SelectItem>
          )}
          {options?.map((species) => (
            <SelectItem
              id="species-selector-options"
              key={species.hierarchId}
              value={species.hierarchId}
              className={cn('cursor-pointer py-2.5 px-3', '[&_.select-icon-wrapper]:top-4')}
              checkIconClassName="text-primary-8 size-5 ite"
              checkIcon={<RiCheckboxCircleFill className="text-primary-8" />}
            >
              <div className="flex flex-col">
                <span
                  className={cn('text-base font-medium text-primary-8', {
                    'font-bold': !isAllMode && selectedSpecies?.hierarchId === species.hierarchId,
                  })}
                >
                  {species.displayName}
                </span>
                <span className="text-xs text-gray-400">
                  {SPECIES_SUBTITLES[species.name] ?? species.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
