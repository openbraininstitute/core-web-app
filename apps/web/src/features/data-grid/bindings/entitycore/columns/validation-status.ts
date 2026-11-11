import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { FilterOptionsKind, OperatorId } from '@/features/data-grid/core';

import type { IColumnFilter, TFilterOptionsSource } from '@/features/data-grid/core';

export const VALIDATION_STATUS_OPTIONS: TFilterOptionsSource = {
  kind: FilterOptionsKind.Static,
  items: [
    { id: ValidationStatus.Created, label: 'Created' },
    { id: ValidationStatus.Initialized, label: 'Initialized' },
    { id: ValidationStatus.Running, label: 'Running' },
    { id: ValidationStatus.Done, label: 'Done' },
    { id: ValidationStatus.Error, label: 'Error' },
  ],
};

export const VALIDATION_STATUS_LABELS: ReadonlyMap<string, string> = new Map(
  VALIDATION_STATUS_OPTIONS.kind === FilterOptionsKind.Static
    ? VALIDATION_STATUS_OPTIONS.items.map((i) => [i.id, i.label] as const)
    : []
);

/** Exact match only; explicit target because a flat filter with no options falls back to facets. */
export function validationStatusFilter({
  field,
  label,
  description,
}: {
  field: string;
  label: string;
  description?: string;
}): IColumnFilter {
  return {
    operators: [OperatorId.Eq],
    field,
    targets: [
      {
        id: 'validationStatus',
        label,
        field,
        operators: [OperatorId.Eq],
        options: VALIDATION_STATUS_OPTIONS,
        description,
      },
    ],
  };
}
