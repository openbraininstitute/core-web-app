'use client';

/**
 * species metadata and row-level lookup context for entity import.
 *
 * remote suggestions (e.g. brain region, subject) may carry `metadata.speciesId` /
 * `metadata.species` so the UI can show which species a resolved entity belongs to.
 * `resolveRowSpeciesSuggestion` merges: row `lookupContext.selectedSpecies` (validator dropdown)
 * first, then related field’s suggestion species, then current field’s suggestion. Validator choice
 * must win so users can override inferred species when filtering remote lookups.
 */

import type { IImportRowState, ISuggestion } from '@/features/entity-import/core/contracts';

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** parses species id and label from suggestion metadata when present. */
export function readSpeciesSuggestionFromMetadata(metadata: unknown): ISuggestion | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const speciesId = normalizeNonEmptyString((metadata as { speciesId?: unknown }).speciesId);
  const speciesLabel = normalizeNonEmptyString((metadata as { species?: unknown }).species);
  if (!speciesId || !speciesLabel) {
    return null;
  }

  return {
    value: speciesId,
    label: speciesLabel,
  };
}

/** species derived from a selected remote suggestion’s metadata. */
export function readSpeciesSuggestionFromSuggestion(
  suggestion: ISuggestion | null | undefined
): ISuggestion | null {
  return readSpeciesSuggestionFromMetadata(suggestion?.metadata);
}

/**
 * effective species for API filters and UI: related-field suggestion, then row lookup species,
 * then this field’s suggestion.
 */
export function resolveRowSpeciesSuggestion({
  row,
  fieldPath,
  relatedFieldPath,
}: {
  row: IImportRowState;
  fieldPath: string;
  relatedFieldPath?: string;
}): ISuggestion | null {
  const currentFieldSpecies = readSpeciesSuggestionFromSuggestion(
    row.cells[fieldPath]?.remoteState.selectedSuggestion
  );
  const relatedFieldSpecies = relatedFieldPath
    ? readSpeciesSuggestionFromSuggestion(
        row.cells[relatedFieldPath]?.remoteState.selectedSuggestion
      )
    : null;

  return row.lookupContext.selectedSpecies ?? relatedFieldSpecies ?? currentFieldSpecies;
}

/** true when two fields’ selected suggestions refer to different species (both known). */
export function hasSpeciesMismatch({
  row,
  leftFieldPath,
  rightFieldPath,
}: {
  row: IImportRowState;
  leftFieldPath: string;
  rightFieldPath: string;
}): boolean {
  const leftSpecies = readSpeciesSuggestionFromSuggestion(
    row.cells[leftFieldPath]?.remoteState.selectedSuggestion
  );
  const rightSpecies = readSpeciesSuggestionFromSuggestion(
    row.cells[rightFieldPath]?.remoteState.selectedSuggestion
  );

  return Boolean(
    leftSpecies?.value && rightSpecies?.value && leftSpecies.value !== rightSpecies.value
  );
}

/** stable ordering copy for cross-field species validation messages. */
export function createSpeciesMismatchMessage(leftLabel: string, rightLabel: string): string {
  const [firstLabel, secondLabel] = [leftLabel, rightLabel].sort((left, right) =>
    left.localeCompare(right)
  );
  return `${firstLabel} and ${secondLabel} must belong to the same species.`;
}
