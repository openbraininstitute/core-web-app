import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportCellState,
  type IImportFieldDefinition,
  type IImportRowState,
  type IImportSessionState,
  type ISuggestion,
  NotificationTone,
  RemoteValidationStatus,
  RowStatus,
  type TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import * as summaryModule from '@/features/entity-import/core/summary';

import type { CsvHydratedCellValue } from '@/features/entity-import/core/adapter';

let rowIdCounter = 0;

function nextRowId(): string {
  rowIdCounter += 1;
  return `import-row-${rowIdCounter}`;
}

function isHydratedCellValue(value: unknown): value is CsvHydratedCellValue {
  return (
    Boolean(value) && typeof value === 'object' && 'rawValue' in (value as CsvHydratedCellValue)
  );
}

function createCellState(
  field: IImportFieldDefinition,
  value: string | CsvHydratedCellValue = ''
): IImportCellState {
  const isHydratedValue = isHydratedCellValue(value);
  const rawValue = isHydratedValue ? value.rawValue : value;
  const displayValue = isHydratedValue
    ? 'displayValue' in value
      ? (value.displayValue ?? null)
      : rawValue
        ? rawValue
        : null
    : rawValue
      ? rawValue
      : null;
  const parsedCellValue = isHydratedValue
    ? 'parsedValue' in value
      ? value.parsedValue
      : rawValue
    : rawValue;

  return {
    fieldPath: field.path,
    rawValue,
    displayValue,
    parsedValue: parsedCellValue,
    status: CellStatus.Idle,
    issues: [],
    dependencyState: DependencyState.Ready,
    remoteState: createIdleRemoteState(),
    correctionDraft: null,
  };
}

function createRowCells(
  fields: Array<IImportFieldDefinition>,
  values: Record<string, string | CsvHydratedCellValue>
): IImportRowState['cells'] {
  return Object.fromEntries(
    fields.map((field) => [field.path, createCellState(field, values[field.path] ?? '')])
  );
}

function createRowState(
  fields: Array<IImportFieldDefinition>,
  values: Record<string, string | CsvHydratedCellValue>,
  rowIndex: number
): IImportRowState {
  return {
    id: nextRowId(),
    rowIndex,
    rowStatus: RowStatus.Idle,
    cells: createRowCells(fields, values),
  };
}

function reindexRows(rows: Array<IImportRowState>): Array<IImportRowState> {
  return rows.map((row, rowIndex) => (row.rowIndex === rowIndex ? row : { ...row, rowIndex }));
}

function cloneRemoteState(
  remoteState: IImportCellState['remoteState']
): IImportCellState['remoteState'] {
  return remoteState.suggestionPaging
    ? {
        ...remoteState,
        suggestionPaging: { ...remoteState.suggestionPaging },
      }
    : { ...remoteState };
}

export function replaceSessionRows(
  session: IImportSessionState,
  nextRows: Array<IImportRowState>,
  options?: { summary?: IImportSessionState['summary'] }
): IImportSessionState {
  if (nextRows === session.rows && !options?.summary) {
    return session;
  }

  return {
    ...session,
    rows: nextRows,
    summary: options?.summary ?? summaryModule.summarizeImportRows(nextRows, session.fields),
  };
}

function updateRowById(
  session: IImportSessionState,
  rowId: string,
  updater: (row: IImportRowState) => IImportRowState
): IImportSessionState {
  let didChange = false;
  const nextRows = session.rows.map((row) => {
    if (row.id !== rowId) {
      return row;
    }

    const nextRow = updater(row);
    didChange ||= nextRow !== row;
    return nextRow;
  });

  return replaceSessionRows(session, didChange ? nextRows : session.rows);
}

function updateRows(
  session: IImportSessionState,
  updater: (row: IImportRowState) => IImportRowState
): IImportSessionState {
  let didChange = false;
  const nextRows = session.rows.map((row) => {
    const nextRow = updater(row);
    didChange ||= nextRow !== row;
    return nextRow;
  });

  return replaceSessionRows(session, didChange ? nextRows : session.rows);
}

function upsertSuggestion(
  suggestions: Array<ISuggestion>,
  suggestion: ISuggestion
): Array<ISuggestion> {
  if (suggestions.some((candidate) => candidate.value === suggestion.value)) {
    return suggestions.map((candidate) =>
      candidate.value === suggestion.value ? { ...candidate, ...suggestion } : candidate
    );
  }

  return [suggestion, ...suggestions];
}

function toSelectedCell(
  selection: IImportSessionState['validatorSelection']
): IImportSessionState['selectedCell'] {
  if (
    !selection.rowId ||
    !selection.fieldPath ||
    selection.fieldPath === ENTITY_IMPORT_ALL_COLUMNS
  ) {
    return null;
  }

  return {
    rowId: selection.rowId,
    fieldPath: selection.fieldPath,
  };
}

function normalizeFlatValues(
  fields: Array<IImportFieldDefinition>,
  values?: TFlatImportValues
): TFlatImportValues {
  return Object.fromEntries(fields.map((field) => [field.path, values?.[field.path] ?? '']));
}

function resolveSelectionAfterRowDelete(
  session: IImportSessionState,
  deletedRowId: string,
  nextRows: Array<IImportRowState>
): Pick<IImportSessionState, 'selectedCell' | 'validatorSelection'> {
  if (session.validatorSelection.rowId !== deletedRowId) {
    return {
      selectedCell: session.selectedCell,
      validatorSelection: session.validatorSelection,
    };
  }

  const deletedRowIndex = session.rows.findIndex((row) => row.id === deletedRowId);
  const fallbackRow = nextRows[deletedRowIndex] ?? nextRows[deletedRowIndex - 1] ?? null;
  const nextValidatorSelection = {
    rowId: fallbackRow?.id ?? null,
    fieldPath: fallbackRow ? session.validatorSelection.fieldPath : null,
  };

  return {
    selectedCell: toSelectedCell(nextValidatorSelection),
    validatorSelection: nextValidatorSelection,
  };
}

export function createImportSessionState({
  fields,
  rowCount,
  rows,
}: {
  fields: Array<IImportFieldDefinition>;
  rowCount?: number;
  rows?: Array<TFlatImportValues>;
}): IImportSessionState {
  const normalizedRows =
    rows && rows.length > 0
      ? rows
      : Array.from({ length: rowCount ?? 1 }, () =>
          Object.fromEntries(fields.map((field) => [field.path, '']))
        );

  const sessionRows = normalizedRows.map((row, index) => createRowState(fields, row, index));

  return {
    fields,
    rows: sessionRows,
    selectedCell: null,
    validatorSelection: {
      rowId: null,
      fieldPath: null,
    },
    notifications: [],
    summary: summaryModule.summarizeImportRows(sessionRows, fields),
  };
}

export function appendEmptyRow(
  session: IImportSessionState,
  values?: TFlatImportValues
): IImportSessionState {
  const nextRows = [
    ...session.rows,
    createRowState(
      session.fields,
      normalizeFlatValues(session.fields, values),
      session.rows.length
    ),
  ];

  return replaceSessionRows(session, nextRows);
}

export function clearRow(
  session: IImportSessionState,
  params: {
    rowId: string;
    values?: TFlatImportValues;
  }
): IImportSessionState {
  const normalizedValues = normalizeFlatValues(session.fields, params.values);
  return updateRowById(session, params.rowId, (row) => ({
    ...row,
    rowStatus: RowStatus.Idle,
    cells: createRowCells(session.fields, normalizedValues),
  }));
}

export function deleteRow(
  session: IImportSessionState,
  params: {
    rowId: string;
  }
): IImportSessionState {
  const filteredRows = session.rows.filter((row) => row.id !== params.rowId);
  const nextRows = reindexRows(filteredRows);
  const nextSelection = resolveSelectionAfterRowDelete(session, params.rowId, nextRows);

  return {
    ...replaceSessionRows(session, nextRows),
    ...nextSelection,
  };
}

export function dismissNotification(
  session: IImportSessionState,
  notificationId: string
): IImportSessionState {
  return {
    ...session,
    notifications: session.notifications.filter(
      (notification) => notification.id !== notificationId
    ),
  };
}

export function pushNotification(
  session: IImportSessionState,
  notification: IImportSessionState['notifications'][number]
): IImportSessionState {
  return {
    ...session,
    notifications: [notification, ...session.notifications],
  };
}

export function selectCell(
  session: IImportSessionState,
  params: { rowId: string; fieldPath: string }
): IImportSessionState {
  const validatorSelection = {
    rowId: params.rowId,
    fieldPath: params.fieldPath,
  };

  return {
    ...session,
    validatorSelection,
    selectedCell: params,
  };
}

export function setValidatorSelection(
  session: IImportSessionState,
  params: {
    rowId?: string | null;
    fieldPath?: string | null;
  }
): IImportSessionState {
  const validatorSelection = {
    rowId: params.rowId !== undefined ? params.rowId : session.validatorSelection.rowId,
    fieldPath:
      params.fieldPath !== undefined ? params.fieldPath : session.validatorSelection.fieldPath,
  };

  return {
    ...session,
    validatorSelection,
    selectedCell: toSelectedCell(validatorSelection),
  };
}

export function hydrateSessionRows(
  session: IImportSessionState,
  params: {
    rows: Array<Record<string, string | CsvHydratedCellValue>>;
    strippedColumns: Array<string>;
  }
): IImportSessionState {
  const nextRows = params.rows.map((row, index) => createRowState(session.fields, row, index));

  const notification =
    params.strippedColumns.length > 0
      ? [
          {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Warning,
            message: `The following columns were removed as they don't match the template: ${params.strippedColumns.join(', ')}`,
          },
        ]
      : [];

  return {
    ...replaceSessionRows(session, nextRows),
    notifications: [...notification, ...session.notifications],
  };
}

export function setCellRemoteState(
  session: IImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    remoteState: IImportCellState['remoteState'];
  }
): IImportSessionState {
  return updateRowById(session, params.rowId, (row) => {
    const currentCell = row.cells[params.fieldPath];
    if (!currentCell) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          remoteState: params.remoteState,
        },
      },
    };
  });
}

export function updateCellRawValue(
  session: IImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
  }
): IImportSessionState {
  return setCellValue(session, params);
}

export function setCellValue(
  session: IImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }
): IImportSessionState {
  return updateRowById(session, params.rowId, (row) => {
    const currentCell = row.cells[params.fieldPath];
    if (!currentCell) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          rawValue: params.rawValue,
          displayValue: params.displayValue ?? null,
          parsedValue: params.parsedValue ?? params.rawValue,
          status: CellStatus.Idle,
          issues: [],
          dependencyState: DependencyState.Ready,
          remoteState: createIdleRemoteState(),
          correctionDraft: null,
        },
      },
    };
  });
}

export function resolveCellSuggestion(
  session: IImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    suggestion: ISuggestion;
    suggestionPaging?: IImportCellState['remoteState']['suggestionPaging'];
  }
): IImportSessionState {
  return updateRowById(session, params.rowId, (row) => {
    const currentCell = row.cells[params.fieldPath];
    if (!currentCell) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          rawValue: params.suggestion.label,
          displayValue: params.suggestion.label,
          parsedValue: params.suggestion.value,
          status: CellStatus.Idle,
          issues: [],
          dependencyState: DependencyState.Ready,
          remoteState: params.suggestionPaging
            ? {
                status: RemoteValidationStatus.Valid,
                suggestions: [],
                selectedSuggestion: params.suggestion,
                message: null,
                suggestionPaging: params.suggestionPaging,
              }
            : {
                status: RemoteValidationStatus.Valid,
                suggestions: [],
                selectedSuggestion: params.suggestion,
                message: null,
              },
          correctionDraft: null,
        },
      },
    };
  });
}

export function resolveSuggestionToRows(
  session: IImportSessionState,
  params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: ISuggestion;
    applyToAllMatching: boolean;
  }
): IImportSessionState {
  return updateRows(session, (row) => {
    const currentCell = row.cells[params.fieldPath];
    const shouldApply = params.applyToAllMatching || row.id === params.targetRowId;

    if (!currentCell || !shouldApply) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          rawValue: params.suggestion.label,
          displayValue: params.suggestion.label,
          parsedValue: params.suggestion.value,
          status: CellStatus.Idle,
          issues: [],
          dependencyState: DependencyState.Ready,
          remoteState: {
            status: RemoteValidationStatus.Valid,
            suggestions: upsertSuggestion(currentCell.remoteState.suggestions, params.suggestion),
            selectedSuggestion: params.suggestion,
            message: null,
          },
          correctionDraft: null,
        },
      },
    };
  });
}

export function stageSuggestionToRows(
  session: IImportSessionState,
  params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: ISuggestion;
    /** When true, stage the suggestion on every row for this column (accept/reject per row). */
    applyToAllMatching: boolean;
  }
): IImportSessionState {
  return updateRows(session, (row) => {
    const currentCell = row.cells[params.fieldPath];
    const shouldApply = params.applyToAllMatching || row.id === params.targetRowId;

    if (!currentCell || !shouldApply) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          status: CellStatus.Idle,
          issues: [],
          dependencyState: DependencyState.Ready,
          remoteState: {
            status: RemoteValidationStatus.Valid,
            suggestions: upsertSuggestion(currentCell.remoteState.suggestions, params.suggestion),
            selectedSuggestion: params.suggestion,
            message: null,
          },
          correctionDraft: {
            previousRawValue: currentCell.rawValue,
            previousDisplayValue: currentCell.displayValue,
            previousParsedValue: currentCell.parsedValue,
            previousRemoteState: cloneRemoteState(currentCell.remoteState),
            suggestion: params.suggestion,
          },
        },
      },
    };
  });
}

export function acceptCorrectionDraft(
  session: IImportSessionState,
  params: { rowId: string; fieldPath: string }
): IImportSessionState {
  const draft = session.rows.find((row) => row.id === params.rowId)?.cells[params.fieldPath]
    .correctionDraft;
  if (!draft) {
    return session;
  }

  return resolveCellSuggestion(session, {
    rowId: params.rowId,
    fieldPath: params.fieldPath,
    suggestion: draft.suggestion,
  });
}

export function rejectCorrectionDraft(
  session: IImportSessionState,
  params: { rowId: string; fieldPath: string }
): IImportSessionState {
  return updateRowById(session, params.rowId, (row) => {
    const currentCell = row.cells[params.fieldPath];
    const draft = currentCell?.correctionDraft;
    if (!currentCell || !draft) {
      return row;
    }

    return {
      ...row,
      cells: {
        ...row.cells,
        [params.fieldPath]: {
          ...currentCell,
          rawValue: draft.previousRawValue,
          displayValue: draft.previousDisplayValue,
          parsedValue: draft.previousParsedValue,
          status: CellStatus.Idle,
          issues: [],
          dependencyState: DependencyState.Ready,
          remoteState: cloneRemoteState(draft.previousRemoteState),
          correctionDraft: null,
        },
      },
    };
  });
}
