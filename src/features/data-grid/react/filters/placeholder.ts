import {
  FilterOptionsKind,
  FreeEntryKind,
  freeEntryKind,
  OperatorId,
  OperatorUiKind,
} from '../../core';

import type { IFilterTarget, IOperatorDef } from '../../core';

/**
 * The exact separators {@link parseIdTokens} splits on, in prose. This string and
 * the parser's `SEPARATORS` regex (`/[\s,;]+/`) are two views of ONE rule — change
 * them together, or the UI promises something the parser does not honour.
 */
export const FREE_ENTRY_SEPARATOR_HINT =
  'Separate values with spaces, commas, semicolons or new lines.';

/** A real, well-formed id, shown so the expected shape is unmistakable. */
const SAMPLE_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

/**
 * Placeholder text for a filter's value input.
 *
 * A schema may state it outright with {@link IFilterTarget.placeholder}; that always
 * wins. Otherwise it is derived from what the ACTIVE operator actually collects —
 * one value or a list, ids or free text — because the same editor serves every
 * filter and "Paste one or more ids" is simply wrong for, say, an annotation value.
 *
 * Follows the app's content rules: sentence case, no `e.g.` prefix, a concrete
 * example where one exists, and never a restatement of the field's own label.
 */
export function resolveFilterPlaceholder(target: IFilterTarget, operator: IOperatorDef): string {
  if (target.placeholder) return target.placeholder;

  // Static option lists render a Select (`lifecycle_status`, protocol design, …),
  // not a free-text field — "Enter" would be wrong.
  if (target.options?.kind === FilterOptionsKind.Static) {
    return 'Select a value';
  }

  switch (operator.uiKind) {
    case OperatorUiKind.Set:
      // Only claim "ids" when the target genuinely collects ids.
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
