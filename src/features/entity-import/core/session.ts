import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  type FlatImportValues,
  type ImportCellState,
  type ImportFieldDefinition,
  type ImportRowState,
  type ImportSessionState,
  NotificationTone,
  RemoteValidationStatus,
  RowStatus,
  type Suggestion,
} from './contracts';

let rowIdCounter = 0;

function nextRowId(): string {
  rowIdCounter += 1;
  return `import-row-${rowIdCounter}`;
}

function createCellState(field: ImportFieldDefinition, rawValue = ''): ImportCellState {
  return {
    fieldPath: field.path,
    rawValue,
    displayValue: rawValue ? rawValue : null,
    parsedValue: rawValue,
    status: CellStatus.Idle,
    issues: [],
    dependencyState: DependencyState.Ready,
    remoteState: createIdleRemoteState(),
  };
}

function createRowState(
  fields: Array<ImportFieldDefinition>,
  values: FlatImportValues,
  rowIndex: number
): ImportRowState {
  return {
    id: nextRowId(),
    rowIndex,
    rowStatus: RowStatus.Idle,
    cells: Object.fromEntries(
      fields.map((field) => [field.path, createCellState(field, values[field.path] ?? '')])
    ),
  };
}

function cloneSessionRows(rows: Array<ImportRowState>): Array<ImportRowState> {
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
          },
        },
      ])
    ),
  }));
}

function summarizeSession(
  rows: Array<ImportRowState>,
  fields: Array<ImportFieldDefinition>
): ImportSessionState['summary'] {
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

function normalizeFlatValues(
  fields: Array<ImportFieldDefinition>,
  values?: FlatImportValues
): FlatImportValues {
  return Object.fromEntries(fields.map((field) => [field.path, values?.[field.path] ?? '']));
}

export function createImportSessionState({
  fields,
  rowCount,
  rows,
}: {
  fields: Array<ImportFieldDefinition>;
  rowCount?: number;
  rows?: Array<FlatImportValues>;
}): ImportSessionState {
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
    notifications: [],
    summary: summarizeSession(sessionRows, fields),
  };
}

export function appendEmptyRow(
  session: ImportSessionState,
  values?: FlatImportValues
): ImportSessionState {
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

export function dismissNotification(
  session: ImportSessionState,
  notificationId: string
): ImportSessionState {
  return {
    ...session,
    notifications: session.notifications.filter(
      (notification) => notification.id !== notificationId
    ),
  };
}

export function pushNotification(
  session: ImportSessionState,
  notification: ImportSessionState['notifications'][number]
): ImportSessionState {
  return {
    ...session,
    notifications: [notification, ...session.notifications],
  };
}

export function selectCell(
  session: ImportSessionState,
  params: { rowId: string; fieldPath: string }
): ImportSessionState {
  return {
    ...session,
    selectedCell: params,
  };
}

export function hydrateSessionRows(
  session: ImportSessionState,
  params: {
    rows: Array<FlatImportValues>;
    strippedColumns: Array<string>;
  }
): ImportSessionState {
  const nextRows = params.rows.map((row, index) =>
    createRowState(session.fields, normalizeFlatValues(session.fields, row), index)
  );

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
  session: ImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    remoteState: ImportCellState['remoteState'];
  }
): ImportSessionState {
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
  session: ImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
  }
): ImportSessionState {
  return setCellValue(session, params);
}

export function setCellValue(
  session: ImportSessionState,
  params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }
): ImportSessionState {
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
    };

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarizeSession(nextRows, session.fields),
  };
}

export function applySuggestionToRows(
  session: ImportSessionState,
  params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: Suggestion;
    applyToAllMatching: boolean;
  }
): ImportSessionState {
  const nextRows = cloneSessionRows(session.rows).map((row) => {
    const currentCell = row.cells[params.fieldPath];
    const shouldApply =
      currentCell.rawValue === params.sourceValue &&
      (params.applyToAllMatching || row.id === params.targetRowId);

    if (!shouldApply) {
      return row;
    }

    row.cells[params.fieldPath] = {
      ...currentCell,
      rawValue: params.suggestion.value,
      displayValue: params.suggestion.label,
      parsedValue: params.suggestion.value,
      status: CellStatus.Valid,
      issues: [],
      dependencyState: DependencyState.Ready,
      remoteState: {
        status: RemoteValidationStatus.Valid,
        suggestions: [params.suggestion],
        selectedSuggestion: params.suggestion,
        message: null,
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
