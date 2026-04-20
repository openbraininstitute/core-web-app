'use client';

/**
 * validator-side panel for species-scoped remote fields (brain region, subject, …).
 *
 * loads all species once (TanStack Query, infinite stale time), lets the user pick a species
 * (or “All species”), and keeps the main value input in sync. Changing species triggers a
 * suggestion refetch so dropdown results match `resolveRowSpeciesSuggestion` / row lookup context.
 * Species options may be disabled when the backend reports no brain-region hierarchy.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  readSpeciesSuggestionFromSuggestion,
  resolveRowSpeciesSuggestion,
} from '@/features/entity-import/core/shared/species-context';
import {
  ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME,
  ENTITY_IMPORT_SELECT_MENU_PANEL_CLASSNAME,
} from '@/features/entity-import/core/shared/ui';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type {
  IAdapterFieldDefinition,
  IEntityImportActions,
  IEntityImportRuntimeContext,
  IValidatorDraftValue,
} from '@/features/entity-import/core/adapter';
import type {
  IImportCellState,
  IImportRowState,
  ISuggestion,
} from '@/features/entity-import/core/contracts';

const ALL_SPECIES_VALUE = '__all_species__';

function isSpeciesOptionDisabled(species: ISuggestion): boolean {
  return Boolean((species.metadata as { disabled?: boolean } | undefined)?.disabled);
}

/** species select + remote value input for the import validator drawer. */
export function SpeciesScopedFieldPanel({
  field,
  row,
  cell: _cell,
  actions,
  context,
  draftValue,
  onDraftChange,
  querySpecies,
  relatedFieldPath,
}: {
  field: IAdapterFieldDefinition;
  row: IImportRowState;
  cell: IImportCellState;
  actions: IEntityImportActions;
  context: IEntityImportRuntimeContext;
  draftValue: IValidatorDraftValue;
  onDraftChange: (value: IValidatorDraftValue) => void;
  querySpecies: (args: { context: IEntityImportRuntimeContext }) => Promise<Array<ISuggestion>>;
  relatedFieldPath?: string;
}) {
  const { data: speciesOptions = [], isLoading } = useQuery({
    queryKey: ['entity-import/species-options', context.projectId, context.virtualLabId],
    queryFn: () => querySpecies({ context }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const selectedSpecies = resolveRowSpeciesSuggestion({
    row,
    fieldPath: field.path,
    relatedFieldPath,
  });
  const currentFieldSpecies = readSpeciesSuggestionFromSuggestion(
    row.cells[field.path]?.remoteState.selectedSuggestion
  );
  const relatedFieldSpecies = relatedFieldPath
    ? readSpeciesSuggestionFromSuggestion(
        row.cells[relatedFieldPath]?.remoteState.selectedSuggestion
      )
    : null;
  const lookupSpeciesOverridesCurrentField = Boolean(
    row.lookupContext.selectedSpecies?.value &&
      row.lookupContext.selectedSpecies.value !== currentFieldSpecies?.value
  );
  const requestSpecies = lookupSpeciesOverridesCurrentField
    ? row.lookupContext.selectedSpecies
    : relatedFieldSpecies;
  const previousRequestSpeciesValueRef = useRef(requestSpecies?.value ?? ALL_SPECIES_VALUE);
  const displayValue = draftValue.displayValue ?? draftValue.rawValue;
  const availableSpeciesOptions =
    selectedSpecies && !speciesOptions.some((option) => option.value === selectedSpecies.value)
      ? [selectedSpecies, ...speciesOptions]
      : speciesOptions;

  useEffect(() => {
    const currentRequestSpeciesValue = requestSpecies?.value ?? ALL_SPECIES_VALUE;
    if (previousRequestSpeciesValueRef.current === currentRequestSpeciesValue) {
      return;
    }

    previousRequestSpeciesValueRef.current = currentRequestSpeciesValue;
    void actions.onRequestSuggestions({
      rowId: row.id,
      fieldPath: field.path,
      query: draftValue.rawValue,
    });
  }, [actions, draftValue.rawValue, field.path, row.id, requestSpecies?.value]);

  return (
    <div className="space-y-2 px-4">
      <div className="space-y-1">
        <p className="text-xs mb-2 font-semibold uppercase tracking-wide text-neutral-500">
          Species
        </p>
        <Select
          value={selectedSpecies?.value ?? ALL_SPECIES_VALUE}
          onValueChange={(value) => {
            const suggestion =
              value === ALL_SPECIES_VALUE
                ? null
                : (availableSpeciesOptions.find((option) => option.value === value) ?? null);
            actions.onSetRowLookupSpecies({
              rowId: row.id,
              suggestion,
            });
          }}
        >
          <SelectTrigger
            aria-label="Species"
            className={cn(
              'w-full rounded-full border-neutral-200 bg-white',
              'h-11! text-primary-9 font-bold'
            )}
            disabled={isLoading}
          >
            <SelectValue placeholder={isLoading ? 'Loading species' : 'All species'} />
          </SelectTrigger>
          <SelectContent
            viewportClassName="entity-import-species-select-viewport h-auto max-h-80 p-1.5"
            className={cn(ENTITY_IMPORT_SELECT_MENU_PANEL_CLASSNAME, 'max-h-80')}
          >
            <SelectItem
              value={ALL_SPECIES_VALUE}
              className={ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME}
            >
              All species
            </SelectItem>
            {availableSpeciesOptions.map((species) => (
              <SelectItem
                key={species.value}
                value={species.value}
                disabled={isSpeciesOptionDisabled(species)}
                className={ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME}
              >
                {species.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          'pr-4 pl-0 flex items-center gap-2',
          'border rounded-full border-neutral-2 focus-within:border-primary-6 group'
        )}
      >
        <Input
          data-import-input-type={field.inputType}
          autoComplete="off"
          id="validator-value"
          aria-label="Validator value"
          type="text"
          className={cn(
            'h-11 text-lg! text-primary-9! focus-visible:border-none',
            'focus-visible:outline-none focus-visible:ring-0 shadow-none border-none',
            'font-semibold',
            'placeholder:text-sm placeholder:font-light placeholder:text-gray-400'
          )}
          placeholder={field.placeholder}
          value={displayValue}
          onChange={(event) => {
            const nextRawValue = event.target.value;
            onDraftChange({
              rawValue: nextRawValue,
              displayValue: null,
              parsedValue: nextRawValue,
            });
            void actions.onRequestSuggestions({
              rowId: row.id,
              fieldPath: field.path,
              query: nextRawValue,
            });
          }}
        />
      </div>
    </div>
  );
}
