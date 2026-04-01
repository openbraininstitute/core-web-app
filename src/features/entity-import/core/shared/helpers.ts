import dayjs from 'dayjs';

import {
  CellStatus,
  DependencyState,
  type IImportCellState,
  type IImportRowState,
  ImportInputType,
  type ISuggestion,
  type TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import { getTableCellUiStatus, TableCellUiStatus } from '@/features/entity-import/ui/status';
import { cn } from '@/utils/css-class';

import type { Dayjs } from 'dayjs';
import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

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

export function fieldHasSuggestionResolution(field?: IAdapterFieldDefinition): boolean {
  if (!field) {
    return false;
  }

  if (field.inputType === ImportInputType.Select) {
    return false;
  }

  return Boolean(field.remote?.query || field.remote?.evaluate || field.options?.length);
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

export function getCellSubmissionValue(cell: IImportCellState): string {
  return typeof cell.parsedValue === 'string' ? cell.parsedValue : cell.rawValue;
}

export function getRowSubmissionValues(row: IImportRowState): TFlatImportValues {
  return Object.fromEntries(
    Object.entries(row.cells).map(([key, cell]) => [key, getCellSubmissionValue(cell)])
  );
}

/** delay before committing draft text from an inline cell to session state (ms). */
export const INLINE_CELL_DRAFT_COMMIT_DELAY_MS = 250;

/** resolved label shown in the cell: committed `displayValue`, else raw value. */
export function getDisplayValue(cell: IImportCellState): string {
  if (cell.displayValue) {
    return cell.displayValue;
  }

  return cell.rawValue;
}

/** tailwind classes for invalid (non–needs-selection) remote/table controls. */
export const INVALID_CONTROL_CLASSNAME =
  'bg-transparent text-amber-950 [&_textarea]:text-amber-950 bg-amber-50/70 [&_textarea]:bg-amber-50/70';

/** tailwind classes for dependency-blocked controls. */
export const BLOCKED_CONTROL_CLASSNAME =
  'bg-neutral-100 text-neutral-500 [&_textarea]:text-neutral-500 bg-neutral-100 [&_textarea]:bg-neutral-100';

/** base + state classes for text inputs, selects, and similar controls inside import table cells. */
export function getControlClassName(cell: IImportCellState, selected: boolean): string {
  const cellUiStatus = getTableCellUiStatus(cell);

  return cn(
    'h-full w-full rounded-none border-0 bg-transparent px-3 py-2 text-base! font-semibold!',
    'placeholder:font-light! placeholder:text-gray-400! text-primary-9! placeholder:text-sm!',
    'shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0',
    { 'text-blue-950': selected },
    {
      'bg-sky-50/70 text-sky-950 [&_textarea]:bg-sky-50/70 [&_textarea]:text-sky-950':
        cellUiStatus === TableCellUiStatus.NeedsSelection,
    },
    {
      [INVALID_CONTROL_CLASSNAME]:
        cellUiStatus !== TableCellUiStatus.NeedsSelection && cell.status === CellStatus.Invalid,
    },
    { [BLOCKED_CONTROL_CLASSNAME]: cell.dependencyState === DependencyState.Blocked }
  );
}
