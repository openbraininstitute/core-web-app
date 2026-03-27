import {
  CellStatus,
  type IImportFieldDefinition,
  type IImportRowState,
  type IImportSessionState,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';

function countRowInvalidRequiredCells(
  row: IImportRowState,
  fields: Array<IImportFieldDefinition>
): number {
  let count = 0;
  fields.forEach((field) => {
    const cell = row.cells[field.path];
    const isRequiredInvalid =
      field.required &&
      (cell.rawValue.trim() === '' ||
        cell.status === CellStatus.Invalid ||
        cell.status === CellStatus.Disabled ||
        cell.remoteState.status === RemoteValidationStatus.Invalid ||
        cell.remoteState.status === RemoteValidationStatus.Pending);

    if (isRequiredInvalid) {
      count += 1;
    }
  });
  return count;
}

/**
 * Full summary scan across all rows. Used for initial load, CSV upload, and
 * any operation where incremental computation is not possible.
 */
export function summarizeImportRows(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): IImportSessionState['summary'] {
  let invalidRequiredCellCount = 0;
  rows.forEach((row) => {
    invalidRequiredCellCount += countRowInvalidRequiredCells(row, fields);
  });

  return {
    canSubmit: rows.length > 0 && invalidRequiredCellCount === 0,
    invalidRequiredCellCount,
  };
}

/**
 * Incremental summary update. Instead of scanning every row, only recomputes
 * the contribution of changed rows and adjusts the previous total by delta.
 *
 * @param previousRows - The row array before the mutation (used to subtract old contributions).
 * @param nextRows - The row array after the mutation.
 * @param fields - Field definitions (stable across the operation).
 * @param previousSummary - The summary computed from `previousRows`.
 * @param changedRowIds - The set of row IDs that were mutated. Only these rows
 *   are re-scanned; all others are assumed unchanged.
 */
export function summarizeImportRowsIncremental(
  previousRows: Array<IImportRowState>,
  nextRows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>,
  previousSummary: IImportSessionState['summary'],
  changedRowIds: Set<string>
): IImportSessionState['summary'] {
  // If the row count changed (add/delete), fall back to full scan.
  if (previousRows.length !== nextRows.length) {
    return summarizeImportRows(nextRows, fields);
  }

  let delta = 0;

  // Subtract old contributions of changed rows, add new contributions.
  for (let i = 0; i < nextRows.length; i++) {
    const nextRow = nextRows[i];
    if (!changedRowIds.has(nextRow.id)) {
      continue;
    }

    const previousRow = previousRows[i];
    // Safety: if the row at the same index has a different id, the array was
    // reordered and we must fall back to a full scan.
    if (!previousRow || previousRow.id !== nextRow.id) {
      return summarizeImportRows(nextRows, fields);
    }

    const oldCount = countRowInvalidRequiredCells(previousRow, fields);
    const newCount = countRowInvalidRequiredCells(nextRow, fields);
    delta += newCount - oldCount;
  }

  const invalidRequiredCellCount = previousSummary.invalidRequiredCellCount + delta;

  return {
    canSubmit: nextRows.length > 0 && invalidRequiredCellCount === 0,
    invalidRequiredCellCount,
  };
}

export const ValidatorFieldStatus = {
  Idle: 'idle',
  Valid: 'valid',
  Warning: 'warning',
} as const;

export type TValidatorFieldStatus =
  (typeof ValidatorFieldStatus)[keyof typeof ValidatorFieldStatus];

/**
 * Precompute a status map for each field across all rows.
 * This replaces the render-time `resolveFieldStatus` scan in ValidatorPanel.
 */
export function computeFieldStatusMap(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): Record<string, TValidatorFieldStatus> {
  const result: Record<string, TValidatorFieldStatus> = {};

  fields.forEach((field) => {
    let hasInvalid = false;
    let allValid = rows.length > 0;

    for (const row of rows) {
      const cell = row.cells[field.path];
      if (cell.status === CellStatus.Invalid || cell.status === CellStatus.Disabled) {
        hasInvalid = true;
        break;
      }
      if (cell.status !== CellStatus.Valid) {
        allValid = false;
      }
    }

    if (hasInvalid) {
      result[field.path] = ValidatorFieldStatus.Warning;
    } else if (allValid) {
      result[field.path] = ValidatorFieldStatus.Valid;
    } else {
      result[field.path] = ValidatorFieldStatus.Idle;
    }
  });

  return result;
}

/**
 * Precompute the overall rows summary status.
 * This replaces the render-time `resolveRowsSummaryStatus` scan in ValidatorPanel.
 */
export function computeRowsSummaryStatus(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): TValidatorFieldStatus {
  if (rows.some((row) => row.rowStatus === RowStatus.Invalid)) {
    return ValidatorFieldStatus.Warning;
  }

  if (
    rows.some((row) =>
      fields.some((field) => {
        if (field.required) {
          return false;
        }
        const cell = row.cells[field.path];
        return cell.status === CellStatus.Invalid || cell.status === CellStatus.Disabled;
      })
    )
  ) {
    return ValidatorFieldStatus.Idle;
  }

  if (rows.length > 0 && rows.every((row) => row.rowStatus === RowStatus.Valid)) {
    return ValidatorFieldStatus.Valid;
  }

  return ValidatorFieldStatus.Idle;
}
