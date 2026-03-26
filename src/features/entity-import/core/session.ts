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
  return rows.map((row, rowIndex) => ({
    ...row,
    rowIndex,
  }));
}

function cloneSessionRows(rows: Array<IImportRowState>): Array<IImportRowState> {
  return rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [
        key,
        {
          ...cell,
          issues: [...cell.issues],
          remoteState: {
            ...cell.remoteState,
            suggestions: [...cell.remoteState.suggestions],
            suggestionPaging: cell.remoteState.suggestionPaging
              ? { ...cell.remoteState.suggestionPaging }
              : undefined,
          },
          correctionDraft: cell.correctionDraft
            ? {
                ...cell.correctionDraft,
                previousParsedValue: cell.correctionDraft.previousParsedValue,
                previousRemoteState: {
                  ...cell.correctionDraft.previousRemoteState,
                  suggestions: [...cell.correctionDraft.previousRemoteState.suggestions],
                  suggestionPaging: cell.correctionDraft.previousRemoteState.suggestionPaging
                    ? { ...cell.correctionDraft.previousRemoteState.suggestionPaging }
                    : undefined,
                },
                suggestion: { ...cell.correctionDraft.suggestion },
              }
            : null,
        },
      ])
    ),
  }));
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

function summarizeSession(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): IImportSessionState['summary'] {
  let invalidRequiredCellCount = 0;

  rows.forEach((row) => {
    fields.forEach((field) => {
      const cell = row.cells[field.path];

      const isEmpty = cell.rawValue.trim() === '';
      const isInvalid =
        cell.status === CellStatus.Invalid ||
        cell.status === CellStatus.Disabled ||
        cell.remoteState.status === RemoteValidationStatus.Invalid;

      if (field.required && (isEmpty || isInvalid)) {
        invalidRequiredCellCount += 1;
      }
    });
  });

  return {
    canSubmit: rows.length > 0 && invalidRequiredCellCount === 0,
    invalidRequiredCellCount,
  };
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
    summary: summarizeSession(sessionRows, fields),
  };
}

export function appendEmptyRow(
  session: IImportSessionState,
  values?: TFlatImportValues
): IImportSessionState {
  const nextRows = [
    ...cloneSessionRows(session.rows),
    createRowState(
      session.fields,
      normalizeFlatValues(session.fields, values),
      session.rows.length
    ),
  ];

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
}

export function clearRow(
  session: IImportSessionState,
  params: {
    rowId: string;
    values?: TFlatImportValues;
  }
): IImportSessionState {
  const normalizedValues = normalizeFlatValues(session.fields, params.values);
  const nextRows = cloneSessionRows(session.rows).map((row) =>
    row.id === params.rowId
      ? {
          ...row,
          rowStatus: RowStatus.Idle,
          cells: createRowCells(session.fields, normalizedValues),
        }
      : row
  );

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
}

export function deleteRow(
  session: IImportSessionState,
  params: {
    rowId: string;
  }
): IImportSessionState {
  const nextRows = reindexRows(
    cloneSessionRows(session.rows).filter((row) => row.id !== params.rowId)
  );
  const nextSelection = resolveSelectionAfterRowDelete(session, params.rowId, nextRows);

  return {
    ...session,
    ...nextSelection,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
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
    ...session,
    rows: nextRows,
    notifications: [...notification, ...session.notifications],
    summary: summarizeSession(nextRows, session.fields),
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
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    if (row.id !== params.rowId) {
      return row;
    }

    const currentCell = row.cells[params.fieldPath];
    row.cells[params.fieldPath] = {
      ...currentCell,
      remoteState: params.remoteState,
    };
    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
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
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    if (row.id !== params.rowId) {
      return row;
    }

    const currentCell = row.cells[params.fieldPath];
    row.cells[params.fieldPath] = {
      ...currentCell,
      rawValue: params.rawValue,
      displayValue: params.displayValue ?? null,
      parsedValue: params.parsedValue ?? params.rawValue,
      status: CellStatus.Idle,
      issues: [],
      dependencyState: DependencyState.Ready,
      remoteState: createIdleRemoteState(),
      correctionDraft: null,
    };

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
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
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    if (row.id !== params.rowId) {
      return row;
    }

    const currentCell = row.cells[params.fieldPath];
    row.cells[params.fieldPath] = {
      ...currentCell,
      rawValue: params.suggestion.label,
      displayValue: params.suggestion.label,
      parsedValue: params.suggestion.value,
      status: CellStatus.Idle,
      issues: [],
      dependencyState: DependencyState.Ready,
      remoteState: {
        status: RemoteValidationStatus.Valid,
        suggestions: [],
        selectedSuggestion: params.suggestion,
        message: null,
        suggestionPaging: params.suggestionPaging,
      },
      correctionDraft: null,
    };

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
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
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    const currentCell = row.cells[params.fieldPath];
    const shouldApply = params.applyToAllMatching || row.id === params.targetRowId;

    if (!shouldApply) {
      return row;
    }

    row.cells[params.fieldPath] = {
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
        previousRemoteState: {
          ...currentCell.remoteState,
          suggestions: [...currentCell.remoteState.suggestions],
          suggestionPaging: currentCell.remoteState.suggestionPaging
            ? { ...currentCell.remoteState.suggestionPaging }
            : undefined,
        },
        suggestion: params.suggestion,
      },
    };

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
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
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    if (row.id !== params.rowId) {
      return row;
    }

    const currentCell = row.cells[params.fieldPath];
    const draft = currentCell.correctionDraft;
    if (!draft) {
      return row;
    }

    row.cells[params.fieldPath] = {
      ...currentCell,
      rawValue: draft.previousRawValue,
      displayValue: draft.previousDisplayValue,
      parsedValue: draft.previousParsedValue,
      status: CellStatus.Idle,
      issues: [],
      dependencyState: DependencyState.Ready,
      remoteState: draft.previousRemoteState,
      correctionDraft: null,
    };

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
}
