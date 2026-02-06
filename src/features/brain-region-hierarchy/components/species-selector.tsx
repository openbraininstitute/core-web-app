'use client';

import type { IWorkspaceSpecies } from '@/features/brain-region-hierarchy/types';

import {
  useAvailableHierarchySpeciesQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
  useWorkspaceHierarchyRegistry,
} from '@/features/brain-region-hierarchy/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

interface SpeciesSelectorProps {
  selectedSpecies: IWorkspaceSpecies | null;
  onSpeciesChange: (hierarchyId: string) => void;
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

  const { syncSettled } = useWorkspaceHierarchyRegistry();

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

  const options = remoteAvailableHierarchies?.map((h) => ({
    ...h.species,
    hierarchId: h.id,
  }));

  return (
    <span className={cn('flex items-center py-2', className)}>
      <Select
        value={selectedSpecies?.hierarchId || ''}
        onValueChange={onSpeciesChange}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            'h-auto min-h-8 w-auto min-w-25 gap-1 rounded-full border-none bg-transparent px-0 py-1 shadow-none',
            'focus:ring-0 focus-visible:ring-0',
            'transition-colors duration-150'
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-5 text-base font-normal">Species</span>
            <SelectValue
              placeholder={<div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />}
            >
              <span className="text-primary-9 text-base font-bold">
                {selectedSpecies?.displayName || (
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                )}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent
          className="min-w-50 z-9999 bg-white border-background"
          position="popper"
          sideOffset={6}
          alignOffset={0}
          align="start"
        >
          {options?.map((species) => (
            <SelectItem
              key={species.hierarchId}
              value={species.hierarchId}
              className={cn('cursor-pointer py-2.5 px-3')}
              checkIConClassName="text-primary-8 size-5"
            >
              <div className="flex flex-col">
                <span
                  className={cn('text-base font-medium text-primary-8', {
                    'font-bold': selectedSpecies?.hierarchId === species.hierarchId,
                  })}
                >
                  {species.displayName}
                </span>
                <span className="text-xs text-gray-400">{species.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
