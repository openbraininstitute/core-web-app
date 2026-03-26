'use client';

import {
  CellStatus,
  DependencyState,
  type IImportCellState,
  type IImportFieldDefinition,
  type IImportRowState,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';

export const TableCellUiStatus = {
  Idle: 'idle',
  Validating: 'validating',
  NeedsSelection: 'needs-selection',
  Warning: 'warning',
  Ready: 'ready',
} as const;

export type TTableCellUiStatus = (typeof TableCellUiStatus)[keyof typeof TableCellUiStatus];

export const TableRowUiStatus = {
  Idle: 'idle',
  Validating: 'validating',
  NeedsSelection: 'needs-selection',
  NeedsAttention: 'needs-attention',
  Ready: 'ready',
} as const;

export type TTableRowUiStatus = (typeof TableRowUiStatus)[keyof typeof TableRowUiStatus];

export function isAmbiguousRemoteCell(cell: IImportCellState): boolean {
  return (
    cell.remoteState.status === RemoteValidationStatus.Invalid &&
    cell.remoteState.suggestions.length > 1
  );
}

export function getCellStatusMessage(cell: IImportCellState): string | null {
  if (isAmbiguousRemoteCell(cell)) {
    return 'We found multiple possible matches. Use the validator to choose the correct option before importing.';
  }

  return cell.issues[0] ?? cell.remoteState.message ?? null;
}

export function hasCellAttentionIssue(cell: IImportCellState): boolean {
  return (
    cell.issues.length > 0 &&
    cell.rawValue.trim() !== '' &&
    cell.remoteState.message === null &&
    cell.dependencyState !== DependencyState.Blocked &&
    cell.correctionDraft === null
  );
}

export function shouldDisplayCellStatusBadge(cell: IImportCellState): boolean {
  const cellUiStatus = getTableCellUiStatus(cell);
  return (
    hasCellAttentionIssue(cell) ||
    cellUiStatus === TableCellUiStatus.Validating ||
    cellUiStatus === TableCellUiStatus.NeedsSelection
  );
}

export function getTableCellUiStatus(cell: IImportCellState): TTableCellUiStatus {
  if (cell.remoteState.status === RemoteValidationStatus.Pending) {
    return TableCellUiStatus.Validating;
  }

  if (isAmbiguousRemoteCell(cell)) {
    return TableCellUiStatus.NeedsSelection;
  }

  if (
    cell.correctionDraft ||
    cell.dependencyState === DependencyState.Blocked ||
    cell.status === CellStatus.Invalid ||
    cell.remoteState.status === RemoteValidationStatus.Invalid ||
    cell.issues.length > 0
  ) {
    return TableCellUiStatus.Warning;
  }

  if (
    cell.status === CellStatus.Valid ||
    cell.remoteState.status === RemoteValidationStatus.Valid
  ) {
    return TableCellUiStatus.Ready;
  }

  return TableCellUiStatus.Idle;
}

function isProblemCellStatus(status: TTableCellUiStatus): boolean {
  return (
    status === TableCellUiStatus.Validating ||
    status === TableCellUiStatus.Warning ||
    status === TableCellUiStatus.NeedsSelection
  );
}

export function getTableRowUiStatus(
  row: IImportRowState,
  fields?: Array<IImportFieldDefinition>
): TTableRowUiStatus {
  const cellStatuses = Object.values(row.cells).map(getTableCellUiStatus);

  if (row.rowStatus !== RowStatus.Valid) {
    return TableRowUiStatus.NeedsAttention;
  }

  if (!fields) {
    return cellStatuses.some(isProblemCellStatus)
      ? TableRowUiStatus.NeedsSelection
      : TableRowUiStatus.Ready;
  }

  const hasOptionalProblem = fields.some((field) => {
    if (field.required) {
      return false;
    }

    return isProblemCellStatus(getTableCellUiStatus(row.cells[field.path]));
  });

  if (hasOptionalProblem) {
    return TableRowUiStatus.NeedsSelection;
  }

  if (row.rowStatus === RowStatus.Valid || cellStatuses.includes(TableCellUiStatus.Ready)) {
    return TableRowUiStatus.Ready;
  }

  return TableRowUiStatus.Idle;
}

export function getTableRowUiStatusLabel(status: TTableRowUiStatus): string {
  if (status === TableRowUiStatus.Validating) {
    return 'Validating';
  }

  if (status === TableRowUiStatus.NeedsSelection) {
    return 'Needs selection';
  }

  if (status === TableRowUiStatus.NeedsAttention) {
    return 'Needs attention';
  }

  if (status === TableRowUiStatus.Ready) {
    return 'Ready';
  }

  return 'Idle';
}
