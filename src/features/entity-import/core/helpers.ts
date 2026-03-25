import dayjs from 'dayjs';

import type { Dayjs } from 'dayjs';
import type { AdapterFieldDefinition } from './adapter';
import type { FlatImportValues, ImportCellState, ImportRowState, ISuggestion } from './contracts';

export function parseImportDatePickerValue(value: string | null | undefined): Dayjs | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function importDatePickerChangeToRawValue(date: Dayjs | null): string {
  if (!date) {
    return '';
  }

  return date.toISOString();
}

export function formatImportDateDisplayValue(value: string | null | undefined): string {
  const parsed = parseImportDatePickerValue(value);
  if (!parsed) {
    return value?.trim() ?? '';
  }

  return parsed.format('DD/MM/YYYY');
}

function normalizeSuggestionValue(value: string): string {
  return value.trim().toLowerCase();
}

export function fieldHasSuggestionResolution(field?: AdapterFieldDefinition): boolean {
  return Boolean(
    field?.remote?.searchPage ||
      field?.remote?.search ||
      field?.remote?.validate ||
      field?.options?.length
  );
}

export function findExactSuggestionMatch(
  suggestions: Array<ISuggestion>,
  query: string
): ISuggestion | null {
  const normalizedQuery = normalizeSuggestionValue(query);
  if (!normalizedQuery) {
    return null;
  }

  const exactLabelMatches = suggestions.filter(
    (suggestion) => normalizeSuggestionValue(suggestion.label) === normalizedQuery
  );
  if (exactLabelMatches.length === 1) {
    return exactLabelMatches[0];
  }
  if (exactLabelMatches.length > 1) {
    return null;
  }

  const exactValueMatches = suggestions.filter(
    (suggestion) => normalizeSuggestionValue(suggestion.value) === normalizedQuery
  );
  return exactValueMatches.length === 1 ? exactValueMatches[0] : null;
}

export function getCellSubmissionValue(cell: ImportCellState): string {
  return typeof cell.parsedValue === 'string' ? cell.parsedValue : cell.rawValue;
}

export function getRowSubmissionValues(row: ImportRowState): FlatImportValues {
  return Object.fromEntries(
    Object.entries(row.cells).map(([key, cell]) => [key, getCellSubmissionValue(cell)])
  );
}
