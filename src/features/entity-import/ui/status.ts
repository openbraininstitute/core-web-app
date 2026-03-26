'use client';

import {
  CellStatus,
  DependencyState,
  type IImportCellState,
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
  return hasCellAttentionIssue(cell) || getTableCellUiStatus(cell) === TableCellUiStatus.Validating;
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

export function getTableRowUiStatus(row: IImportRowState): TTableRowUiStatus {
  const cellStatuses = Object.values(row.cells).map(getTableCellUiStatus);

  if (cellStatuses.includes(TableCellUiStatus.Validating)) {
    return TableRowUiStatus.Validating;
  }

  if (cellStatuses.includes(TableCellUiStatus.NeedsSelection)) {
    return TableRowUiStatus.NeedsSelection;
  }

  if (Object.values(row.cells).some(hasCellAttentionIssue)) {
    return TableRowUiStatus.NeedsAttention;
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
