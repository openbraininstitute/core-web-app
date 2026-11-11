import {
  FilterOptionsKind,
  FreeEntryKind,
  freeEntryKind,
  OperatorId,
  OperatorUiKind,
} from '@/features/data-grid/core';

import type { IFilterTarget, IOperatorDef } from '@/features/data-grid/core';

/**
 * Prose form of the separators {@link parseIdTokens} splits on. Must be kept in step
 * with that parser's `SEPARATORS` regex, or the UI promises what it does not honour.
 */
export const FREE_ENTRY_SEPARATOR_HINT =
  'Separate values with spaces, commas, semicolons or new lines.';

const SAMPLE_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

/**
 * Placeholder text for a filter's value input. {@link IFilterTarget.placeholder} always
 * wins; otherwise it is derived from what the active operator collects.
 */
export function resolveFilterPlaceholder(target: IFilterTarget, operator: IOperatorDef): string {
  if (target.placeholder) return target.placeholder;

  // static option lists render a Select, not a free-text field
  if (target.options?.kind === FilterOptionsKind.Static) {
    return 'Select a value';
  }

  switch (operator.uiKind) {
    case OperatorUiKind.Set:
      return freeEntryKind(target) === FreeEntryKind.Uuid
        ? `Paste one or more ids, like ${SAMPLE_ID}`
        : 'Enter one or more values';
    case OperatorUiKind.Number:
      return 'Enter a number';
    case OperatorUiKind.Text:
      return operator.id === OperatorId.Ilike || operator.id === OperatorId.Contains
        ? 'Enter text to match'
        : 'Enter a value';
    default:
      return 'Enter a value';
  }
}
