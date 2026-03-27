'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import pLimit from 'p-limit';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createIdleValidatorPreviewState,
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  type IAdapterFieldDefinition,
  type ICsvHydratedCellValue,
  type IEntityImportActions,
  type IEntityImportAdapter,
  type IEntityImportRuntimeContext,
  type IRemoteValidationResult,
  type IValidatorDraftValue,
  type IValidatorPreviewState,
  type IValidatorSuggestionState,
  ValidatorManualApplyMode,
} from '@/features/entity-import/core/adapter';
import {
  createIdleImportRunState,
  createIdleRemoteState,
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportCellState,
  type IImportRowState,
  type IImportRunState,
  type IImportSessionState,
  ImportRowResultStatus,
  ImportRunPhase,
  type ISuggestion,
  NotificationTone,
  RemoteValidationStatus,
  type TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import {
  buildTemplateColumns,
  importCsvRows,
  parseCsvFile,
} from '@/features/entity-import/core/csv';
import {
  getImportFileDisplayValue,
  toParsedFileValue,
  validateImportFiles,
} from '@/features/entity-import/core/file-field';
import {
  fieldHasSuggestionResolution,
  findExactSuggestionMatch,
  getRowSubmissionValues,
} from '@/features/entity-import/core/helpers';
import {
  acceptCorrectionDraft,
  appendEmptyRow,
  applyValueToRows,
  clearRow as clearSessionRow,
  createImportSessionState,
  deleteRow as deleteSessionRow,
  dismissNotification,
  hydrateSessionRows,
  pushNotification,
  rejectCorrectionDraft,
  resolveCellSuggestion,
  resolveSuggestionToRows,
  selectCell as selectCellState,
  setCellRemoteState,
  setCellValue,
  setValidatorSelection as setValidatorSelectionState,
  stageSuggestionToRows,
  updateCellRawValue,
} from '@/features/entity-import/core/session';
import {
  computeFieldStatusMap,
  computeRowsSummaryStatus,
} from '@/features/entity-import/core/summary';
import { validateSessionRows } from '@/features/entity-import/core/validation';
import { getEntityImportTemplateGuide } from '@/features/entity-import/templates/registry';

function findField(
  fields: Array<IAdapterFieldDefinition>,
  fieldPath: string
): IAdapterFieldDefinition | undefined {
  return fields.find((field) => field.path === fieldPath);
}

function findRow(session: IImportSessionState, rowId: string): IImportRowState | undefined {
  return session.rows.find((row) => row.id === rowId);
}

function getCsvRenamedHeaders(
  renamedHeaders: unknown
): Array<{ renamed: string; original: string }> {
  if (!renamedHeaders || typeof renamedHeaders !== 'object') {
    return [];
  }

  return Object.entries(renamedHeaders as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([renamed, original]) => ({ renamed, original }));
}

type CsvUploadNotification = {
  id: string;
  tone: IImportSessionState['notifications'][number]['tone'];
  message: string;
};

const ENTITY_IMPORT_CSV_PARSE_ISSUE_PREVIEW_LIMIT = 3;
const ENTITY_IMPORT_SUBMIT_QUEUE_CONCURRENCY = 4;

function buildCsvParseNotificationMessages(
  parsedCsv: Awaited<ReturnType<typeof parseCsvFile>>
): Array<CsvUploadNotification> {
  const notifications: Array<CsvUploadNotification> = [];
  const renamedHeaders = getCsvRenamedHeaders(parsedCsv.meta.renamedHeaders);

  if (renamedHeaders.length > 0) {
    const renamedSummary = renamedHeaders
      .map(({ renamed, original }) => `${original} -> ${renamed}`)
      .join(', ');
    notifications.push({
      id: 'csv-duplicate-headers',
      tone: NotificationTone.Warning,
      message: `Duplicate CSV headers were renamed by the parser. ${renamedSummary}`,
    });
  }

  if (parsedCsv.errors.length > 0) {
    const previewErrors = parsedCsv.errors.slice(0, ENTITY_IMPORT_CSV_PARSE_ISSUE_PREVIEW_LIMIT);
    const issueLabel = parsedCsv.errors.length === 1 ? 'issue' : 'issues';

    notifications.push({
      id: 'csv-parse-summary',
      tone: NotificationTone.Warning,
      message:
        parsedCsv.errors.length > previewErrors.length
          ? `CSV parsing reported ${parsedCsv.errors.length} ${issueLabel} during upload. Showing first ${previewErrors.length} below.`
          : `CSV parsing reported ${parsedCsv.errors.length} ${issueLabel} during upload.`,
    });

    previewErrors.forEach((error, index) => {
      const rowLabel = typeof error.row === 'number' ? `Row ${error.row + 2}: ` : '';
      notifications.push({
        id: `csv-parse-issue-${index}`,
        tone: NotificationTone.Warning,
        message: `${rowLabel}${error.message}`,
      });
    });
  }

  return notifications;
}

function createRunningImportRunState(rows: Array<IImportRowState>): IImportRunState {
  return {
    phase: ImportRunPhase.Running,
    totalRowCount: rows.length,
    completedRowCount: 0,
    succeededRowCount: 0,
    failedRowCount: 0,
    rowResults: Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          status: ImportRowResultStatus.Idle,
          errorMessage: null,
        },
      ])
    ),
    failureCards: [],
  };
}

function getImportFailureMessage(error: unknown, row: IImportRowState): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return `Row ${row.rowIndex + 1} failed to import.`;
}

async function hydrateCsvRows({
  fields,
  rows,
  context,
  importCache,
}: {
  fields: Array<IAdapterFieldDefinition>;
  rows: Array<TFlatImportValues>;
  context: IEntityImportRuntimeContext;
  importCache?: Map<string, unknown>;
}) {
  const limit = pLimit(6);

  return Promise.all(
    rows.map((row) =>
      limit(async () => {
        const nextRow = { ...row } as Record<string, string | ICsvHydratedCellValue>;

        await Promise.all(
          fields.map(async (field) => {
            if (!field.csv?.hydrateCell) {
              return;
            }

            const rawValue = row[field.path] ?? '';
            nextRow[field.path] = await field.csv.hydrateCell({
              rawValue,
              row,
              context,
              importCache,
            });
          })
        );

        return nextRow;
      })
    )
  );
}

function downloadBlob({
  content,
  type,
  fileName,
}: {
  content: BlobPart;
  type: string;
  fileName: string;
}) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildCurrentCsvFileName(templateFileName: string): string {
  return templateFileName.replace(/(\.csv)?$/i, '-current-state.csv');
}

function createValidatorPreviewValueFromSuggestion(suggestion: ISuggestion): IValidatorDraftValue {
  return {
    rawValue: suggestion.label,
    displayValue: suggestion.label,
    parsedValue:
      (suggestion.metadata as { parsedValue?: unknown } | undefined)?.parsedValue ??
      suggestion.value,
  };
}

function doesValidatorDraftMatchCell(
  cell: IImportRowState['cells'][string],
  draftValue: IValidatorDraftValue
): boolean {
  return (
    cell.rawValue === draftValue.rawValue &&
    (cell.displayValue ?? null) === (draftValue.displayValue ?? null) &&
    Object.is(cell.parsedValue, draftValue.parsedValue)
  );
}

function hasSuggestionSource(field?: IAdapterFieldDefinition): boolean {
  return fieldHasSuggestionResolution(field);
}

function hasRemoteQuery(field?: IAdapterFieldDefinition): boolean {
  return Boolean(field?.remote?.query);
}

function filterLocalSuggestions(
  suggestions: Array<ISuggestion> | undefined,
  query: string
): Array<ISuggestion> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || !suggestions?.length) {
    return [];
  }

  return suggestions
    .filter((suggestion) =>
      `${suggestion.label} ${suggestion.description ?? ''}`.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 12);
}

function mergeSuggestions(...groups: Array<Array<ISuggestion> | undefined>): Array<ISuggestion> {
  const dedupedSuggestions = new Map<string, ISuggestion>();

  groups.flat().forEach((suggestion) => {
    if (!suggestion) {
      return;
    }

    const existingSuggestion = dedupedSuggestions.get(suggestion.value);
    dedupedSuggestions.set(suggestion.value, {
      ...existingSuggestion,
      ...suggestion,
      recommended: existingSuggestion?.recommended || suggestion.recommended,
      description: existingSuggestion?.description ?? suggestion.description,
    });
  });

  return [...dedupedSuggestions.values()];
}

function cellStillMatchesQuery(
  session: IImportSessionState,
  rowId: string,
  fieldPath: string,
  query: string
): boolean {
  return findRow(session, rowId)?.cells[fieldPath].rawValue.trim() === query;
}

function resolveSuggestionMessage(
  field: IAdapterFieldDefinition,
  validationResult: IRemoteValidationResult | null,
  suggestions: Array<ISuggestion>
): string | null {
  if (validationResult?.message) {
    return validationResult.message;
  }

  if (suggestions.length > 0) {
    return 'Choose the closest suggestion and apply it.';
  }

  return `No matches found for ${field.label}.`;
}

function resolveMatchedSuggestion(
  field: IAdapterFieldDefinition,
  query: string,
  validationResult: IRemoteValidationResult | null,
  suggestions: Array<ISuggestion>
): ISuggestion | null {
  if (
    validationResult?.resolvedSuggestion &&
    field.remote?.autoResolveResolvedSuggestion !== false
  ) {
    return validationResult.resolvedSuggestion;
  }

  return findExactSuggestionMatch(suggestions, query);
}

const CsvUploadPhase = {
  Idle: 'idle',
  Parsing: 'parsing',
  Hydrating: 'hydrating',
  PreparingRows: 'preparing-rows',
} as const;

type TCsvUploadPhase = (typeof CsvUploadPhase)[keyof typeof CsvUploadPhase];

interface CsvRowValidationProgress {
  active: boolean;
  totalRowCount: number;
  completedRowCount: number;
}

const ENTITY_IMPORT_INPUT_SYNC_DELAY_MS = 150;
const ENTITY_IMPORT_BACKGROUND_QUEUE_CONCURRENCY = 6;

const ValidationSource = {
  Selection: 'selection',
  Validator: 'validator',
} as const;

type TValidationSource = (typeof ValidationSource)[keyof typeof ValidationSource];

function createIdleValidatorSuggestionState(): IValidatorSuggestionState {
  return {
    rowId: null,
    fieldPath: null,
    query: '',
    ...createIdleRemoteState(),
  };
}

function createIdleCsvRowValidationProgress(): CsvRowValidationProgress {
  return {
    active: false,
    totalRowCount: 0,
    completedRowCount: 0,
  };
}

export function useEntityImportController<TPayload, TResult>({
  adapter,
  context,
  initialRows,
}: {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
  initialRows?: Array<TFlatImportValues>;
}) {
  const validate = useCallback(
    (session: IImportSessionState, rowIds?: Array<string>): IImportSessionState =>
      validateSessionRows({
        session,
        fields: adapter.fields,
        schema: adapter.schema,
        rowIds,
        buildPayload({ row, values }) {
          return adapter.buildPayload({ row, values, context });
        },
      }),
    [adapter, context]
  );

  const [session, setSession] = useState<IImportSessionState>(() => {
    const blankRow = adapter.createBlankRow?.() ?? undefined;
    const baseSession = createImportSessionState({
      fields: adapter.fields,
      rows: initialRows?.length ? initialRows : blankRow ? [blankRow] : undefined,
      rowCount: initialRows?.length ? undefined : 1,
    });

    return validate(baseSession);
  });
  const sessionRef = useRef(session);

  const [csvUploadPhase, setCsvUploadPhase] = useState<TCsvUploadPhase>(CsvUploadPhase.Idle);
  const [csvRowValidationProgress, setCsvRowValidationProgress] =
    useState<CsvRowValidationProgress>(createIdleCsvRowValidationProgress);
  const [csvUploadNotifications, setCsvUploadNotifications] = useState<
    Array<CsvUploadNotification>
  >([]);
  const csvRowValidationPendingCountsRef = useRef<Map<string, number>>(new Map());
  const [validatorSuggestionRequest, setValidatorSuggestionRequest] = useState<{
    rowId: string;
    fieldPath: string;
    query: string;
    source: TValidationSource;
  } | null>(null);
  const validatorSuggestionRequestRef = useRef(validatorSuggestionRequest);
  const [validatorSuggestions, setValidatorSuggestions] = useState<IValidatorSuggestionState>(() =>
    createIdleValidatorSuggestionState()
  );
  const [validatorPreview, setValidatorPreviewState] = useState<IValidatorPreviewState>(() =>
    createIdleValidatorPreviewState()
  );
  const [importRun, setImportRun] = useState<IImportRunState>(() => createIdleImportRunState());
  const validatorSelectionQueryKeyRef = useRef('');
  const pendingCellSyncTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const backgroundQueueLimitRef = useRef(pLimit(ENTITY_IMPORT_BACKGROUND_QUEUE_CONCURRENCY));

  // microbatch buffer for async CSV completion writes.
  // Instead of committing each result individually, results are buffered and
  // flushed together on the next animation frame.
  const asyncResultBufferRef = useRef<
    Map<
      string,
      {
        rowId: string;
        fieldPath: string;
      } & (
        | {
            kind: 'value';
            rawValue: string;
            displayValue: string | null;
            parsedValue: unknown;
          }
        | { kind: 'remoteState'; remoteState: IImportCellState['remoteState'] }
        | {
            kind: 'suggestion';
            suggestion: ISuggestion;
          }
      )
    >
  >(new Map());
  const asyncFlushFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    validatorSuggestionRequestRef.current = validatorSuggestionRequest;
  }, [validatorSuggestionRequest]);

  useEffect(() => {
    return () => {
      pendingCellSyncTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      pendingCellSyncTimeoutsRef.current.clear();
      if (asyncFlushFrameRef.current !== null) {
        cancelAnimationFrame(asyncFlushFrameRef.current);
        asyncFlushFrameRef.current = null;
      }
      asyncResultBufferRef.current.clear();
    };
  }, []);

  const validatorSuggestionsInfinite = useInfiniteQuery({
    queryKey: [
      'entity-import',
      'validator-remote-suggestions',
      adapter.id,
      validatorSuggestionRequest?.rowId ?? '',
      validatorSuggestionRequest?.fieldPath ?? '',
      validatorSuggestionRequest?.query ?? '',
    ],
    enabled: Boolean(validatorSuggestionRequest),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const req = validatorSuggestionRequestRef.current;
      if (!req) {
        return {
          suggestions: [] as Array<ISuggestion>,
          nextPageParam: null as number | null,
        };
      }

      const row = findRow(sessionRef.current, req.rowId);
      const field = findField(adapter.fields, req.fieldPath);
      if (!row || !field) {
        return { suggestions: [], nextPageParam: null };
      }

      const baseArgs = {
        query: req.query,
        row,
        values: getRowSubmissionValues(row),
        context,
      };

      if (field.remote?.query) {
        return field.remote.query({
          ...baseArgs,
          pageParam,
          pageSize: ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
        });
      }

      return { suggestions: [], nextPageParam: null };
    },
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    retry: 1,
  });

  const commit = useCallback(
    (
      updater: (current: IImportSessionState) => IImportSessionState,
      options?: { validate?: boolean; rowIds?: Array<string> }
    ) => {
      setSession((current) => {
        const next = updater(current);
        const resolvedSession =
          options?.validate === false ? next : validate(next, options?.rowIds);
        sessionRef.current = resolvedSession;
        return resolvedSession;
      });
    },
    [validate]
  );

  /**
   * Schedule a buffered async result to be flushed on the next animation frame.
   * Multiple results are batched into a single commit.
   */
  const scheduleBufferedAsyncResult = useCallback(
    (entry: typeof asyncResultBufferRef.current extends Map<string, infer V> ? V : never) => {
      const key = `${entry.rowId}:${entry.fieldPath}`;
      asyncResultBufferRef.current.set(key, entry);

      if (asyncFlushFrameRef.current === null) {
        asyncFlushFrameRef.current = requestAnimationFrame(() => {
          asyncFlushFrameRef.current = null;
          const buffer = asyncResultBufferRef.current;
          if (buffer.size === 0) return;

          const entries = Array.from(buffer.values());
          const affectedRowIds = [...new Set(entries.map((e) => e.rowId))];
          buffer.clear();

          commit(
            (current) => {
              let session = current;
              for (const entry of entries) {
                if (entry.kind === 'value') {
                  session = setCellValue(session, {
                    rowId: entry.rowId,
                    fieldPath: entry.fieldPath,
                    rawValue: entry.rawValue,
                    displayValue: entry.displayValue,
                    parsedValue: entry.parsedValue,
                  });
                } else if (entry.kind === 'remoteState') {
                  session = setCellRemoteState(session, {
                    rowId: entry.rowId,
                    fieldPath: entry.fieldPath,
                    remoteState: entry.remoteState,
                  });
                } else if (entry.kind === 'suggestion') {
                  session = resolveCellSuggestion(session, {
                    rowId: entry.rowId,
                    fieldPath: entry.fieldPath,
                    suggestion: entry.suggestion,
                  });
                }
              }
              return session;
            },
            { rowIds: affectedRowIds }
          );
        });
      }
    },
    [commit]
  );

  const resetCsvRowValidationProgress = useCallback(() => {
    csvRowValidationPendingCountsRef.current = new Map();
    setCsvRowValidationProgress(createIdleCsvRowValidationProgress());
  }, []);

  const dismissCsvUploadNotifications = useCallback(() => {
    setCsvUploadNotifications([]);
  }, []);

  const resetImportRun = useCallback(() => {
    setImportRun(createIdleImportRunState());
  }, []);

  const clearValidatorPreview = useCallback(() => {
    setValidatorPreviewState(createIdleValidatorPreviewState());
  }, []);

  const clearValidatorPreviewForCell = useCallback((rowId: string, fieldPath: string) => {
    setValidatorPreviewState((current) =>
      current.rowId === rowId && current.fieldPath === fieldPath
        ? createIdleValidatorPreviewState()
        : current
    );
  }, []);

  const updateValidatorPreview = useCallback(
    ({
      rowId,
      fieldPath,
      value,
    }: {
      rowId: string;
      fieldPath: string;
      value: IValidatorDraftValue | null;
    }) => {
      setValidatorPreviewState(
        value
          ? {
              rowId,
              fieldPath,
              rawValue: value.rawValue,
              displayValue: value.displayValue ?? null,
              parsedValue: value.parsedValue,
            }
          : createIdleValidatorPreviewState()
      );
    },
    []
  );

  const beginImportRun = useCallback((rows: Array<IImportRowState>) => {
    setImportRun(createRunningImportRunState(rows));
  }, []);

  const markImportRowPending = useCallback((rowId: string) => {
    setImportRun((current) => {
      if (current.phase !== ImportRunPhase.Running) {
        return current;
      }

      const previous = current.rowResults[rowId];
      if (!previous || previous.status === ImportRowResultStatus.Pending) {
        return current;
      }

      return {
        ...current,
        rowResults: {
          ...current.rowResults,
          [rowId]: {
            status: ImportRowResultStatus.Pending,
            errorMessage: null,
          },
        },
      };
    });
  }, []);

  const markImportRowCompleted = useCallback(
    ({ row, errorMessage }: { row: IImportRowState; errorMessage: string | null }) => {
      setImportRun((current) => {
        if (current.phase !== ImportRunPhase.Running) {
          return current;
        }

        const previous = current.rowResults[row.id];
        if (!previous) {
          return current;
        }

        const didFail = Boolean(errorMessage);
        const nextFailureCards =
          didFail && errorMessage
            ? [
                ...current.failureCards,
                {
                  rowId: row.id,
                  rowNumber: row.rowIndex + 1,
                  message: errorMessage,
                },
              ].sort((left, right) => left.rowNumber - right.rowNumber)
            : current.failureCards;

        return {
          ...current,
          completedRowCount: Math.min(current.completedRowCount + 1, current.totalRowCount),
          succeededRowCount: current.succeededRowCount + (didFail ? 0 : 1),
          failedRowCount: current.failedRowCount + (didFail ? 1 : 0),
          rowResults: {
            ...current.rowResults,
            [row.id]: {
              status: didFail ? ImportRowResultStatus.Failed : ImportRowResultStatus.Succeeded,
              errorMessage,
            },
          },
          failureCards: nextFailureCards,
        };
      });
    },
    []
  );

  const completeImportRun = useCallback(() => {
    setImportRun((current) => {
      if (current.phase !== ImportRunPhase.Running) {
        return current;
      }

      return {
        ...current,
        phase: ImportRunPhase.Completed,
      };
    });
  }, []);

  const beginCsvRowValidationProgress = useCallback((targets: Array<{ rowId: string }>) => {
    const pendingCounts = new Map<string, number>();

    targets.forEach(({ rowId }) => {
      pendingCounts.set(rowId, (pendingCounts.get(rowId) ?? 0) + 1);
    });

    csvRowValidationPendingCountsRef.current = pendingCounts;
    setCsvRowValidationProgress(
      pendingCounts.size > 0
        ? {
            active: true,
            totalRowCount: pendingCounts.size,
            completedRowCount: 0,
          }
        : createIdleCsvRowValidationProgress()
    );
  }, []);

  const completeCsvRowValidationTarget = useCallback((rowId: string) => {
    const pendingCounts = csvRowValidationPendingCountsRef.current;
    const nextPendingCount = pendingCounts.get(rowId);

    if (nextPendingCount === undefined) {
      return;
    }

    if (nextPendingCount > 1) {
      pendingCounts.set(rowId, nextPendingCount - 1);
      return;
    }

    pendingCounts.delete(rowId);
    setCsvRowValidationProgress((current) => {
      const completedRowCount = current.completedRowCount + 1;
      if (completedRowCount >= current.totalRowCount) {
        return createIdleCsvRowValidationProgress();
      }

      return {
        ...current,
        completedRowCount,
      };
    });
  }, []);

  const clearValidatorSuggestions = useCallback(() => {
    validatorSelectionQueryKeyRef.current = '';
    validatorSuggestionRequestRef.current = null;
    setValidatorSuggestionRequest(null);
    setValidatorSuggestions(createIdleValidatorSuggestionState());
  }, []);

  const requestValidatorSuggestions = useCallback(
    async ({
      rowId,
      fieldPath,
      query,
      source = 'selection',
    }: {
      rowId: string;
      fieldPath: string;
      query: string;
      source?: 'selection' | 'validator';
    }) => {
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (!row || !field || !hasSuggestionSource(field)) {
        clearValidatorSuggestions();
        return;
      }

      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        clearValidatorSuggestions();
        return;
      }

      validatorSelectionQueryKeyRef.current = `${rowId}:${fieldPath}:${normalizedQuery}`;

      const cell = row.cells[fieldPath];
      const localSuggestions = filterLocalSuggestions(field.options, normalizedQuery);

      if (!hasRemoteQuery(field)) {
        validatorSuggestionRequestRef.current = null;
        setValidatorSuggestionRequest(null);
        setValidatorSuggestions({
          rowId,
          fieldPath,
          query: normalizedQuery,
          status: cell.remoteState.status,
          suggestions: mergeSuggestions(localSuggestions, cell.remoteState.suggestions),
          selectedSuggestion: cell.remoteState.selectedSuggestion,
          message: cell.remoteState.message,
          suggestionPaging: cell.remoteState.suggestionPaging,
        });
        return;
      }

      validatorSuggestionRequestRef.current = {
        rowId,
        fieldPath,
        query: normalizedQuery,
        source,
      };
      setValidatorSuggestionRequest({
        rowId,
        fieldPath,
        query: normalizedQuery,
        source,
      });
      setValidatorSuggestions({
        rowId,
        fieldPath,
        query: normalizedQuery,
        status: RemoteValidationStatus.Pending,
        suggestions: localSuggestions,
        selectedSuggestion: cell.remoteState.selectedSuggestion,
        message: cell.remoteState.message,
        suggestionPaging: {
          hasNextPage: false,
          isFetchingNextPage: false,
        },
      });
    },
    [adapter.fields, clearValidatorSuggestions]
  );

  const evaluateCellRemoteConstraint = useCallback(
    async ({
      rowId,
      fieldPath,
      query,
      notifyOnError = true,
      buffered = false,
    }: {
      rowId: string;
      fieldPath: string;
      query: string;
      notifyOnError?: boolean;
      buffered?: boolean;
    }) => {
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);
      const normalizedQuery = query.trim();

      if (!row || !field?.remote?.evaluate || !normalizedQuery) {
        return;
      }

      const localSuggestions = filterLocalSuggestions(field.options, normalizedQuery);

      try {
        const rowValues = getRowSubmissionValues(row);
        const validationResult = await field.remote.evaluate({
          query: normalizedQuery,
          value: normalizedQuery,
          row,
          values: rowValues,
          context,
        });

        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
          return;
        }

        const resolutionCandidates = mergeSuggestions(
          localSuggestions,
          undefined,
          validationResult.suggestions,
          validationResult.resolvedSuggestion ? [validationResult.resolvedSuggestion] : undefined
        );
        const matchedSuggestion = resolveMatchedSuggestion(
          field,
          normalizedQuery,
          validationResult,
          resolutionCandidates
        );
        const allowResolvedSuggestion = field.remote?.autoResolveResolvedSuggestion !== false;

        if (matchedSuggestion) {
          clearValidatorPreviewForCell(rowId, fieldPath);
          if (buffered) {
            scheduleBufferedAsyncResult({
              rowId,
              fieldPath,
              kind: 'suggestion',
              suggestion: matchedSuggestion,
            });
          } else {
            commit(
              (current) =>
                resolveCellSuggestion(current, {
                  rowId,
                  fieldPath,
                  suggestion: matchedSuggestion,
                }),
              { rowIds: [rowId] }
            );
          }
          return;
        }

        const suggestions =
          validationResult.status === RemoteValidationStatus.Valid && allowResolvedSuggestion
            ? []
            : resolutionCandidates;

        if (buffered) {
          scheduleBufferedAsyncResult({
            rowId,
            fieldPath,
            kind: 'remoteState',
            remoteState: {
              status:
                validationResult.status === RemoteValidationStatus.Valid && allowResolvedSuggestion
                  ? RemoteValidationStatus.Valid
                  : RemoteValidationStatus.Invalid,
              suggestions,
              selectedSuggestion: null,
              message:
                validationResult.status === RemoteValidationStatus.Valid && allowResolvedSuggestion
                  ? null
                  : resolveSuggestionMessage(field, validationResult, suggestions),
            },
          });
        } else {
          commit(
            (current) =>
              setCellRemoteState(current, {
                rowId,
                fieldPath,
                remoteState: {
                  status:
                    validationResult.status === RemoteValidationStatus.Valid &&
                    allowResolvedSuggestion
                      ? RemoteValidationStatus.Valid
                      : RemoteValidationStatus.Invalid,
                  suggestions,
                  selectedSuggestion: null,
                  message:
                    validationResult.status === RemoteValidationStatus.Valid &&
                    allowResolvedSuggestion
                      ? null
                      : resolveSuggestionMessage(field, validationResult, suggestions),
                },
              }),
            { rowIds: [rowId] }
          );
        }
      } catch (error) {
        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`;

        if (!notifyOnError) {
          if (buffered) {
            scheduleBufferedAsyncResult({
              rowId,
              fieldPath,
              kind: 'remoteState',
              remoteState: {
                status: RemoteValidationStatus.Invalid,
                suggestions: localSuggestions,
                selectedSuggestion: null,
                message,
              },
            });
          } else {
            commit(
              (current) =>
                setCellRemoteState(current, {
                  rowId,
                  fieldPath,
                  remoteState: {
                    status: RemoteValidationStatus.Invalid,
                    suggestions: localSuggestions,
                    selectedSuggestion: null,
                    message,
                  },
                }),
              { rowIds: [rowId] }
            );
          }
          return;
        }

        commit(
          (current) =>
            pushNotification(
              setCellRemoteState(current, {
                rowId,
                fieldPath,
                remoteState: {
                  status: RemoteValidationStatus.Invalid,
                  suggestions: localSuggestions,
                  selectedSuggestion: null,
                  message,
                },
              }),
              {
                id: `notification-${Date.now()}`,
                tone: NotificationTone.Error,
                message,
              }
            ),
          { validate: false }
        );
      } finally {
        completeCsvRowValidationTarget(rowId);
      }
    },
    [
      adapter.fields,
      clearValidatorPreviewForCell,
      commit,
      completeCsvRowValidationTarget,
      context,
      scheduleBufferedAsyncResult,
    ]
  );

  const hydrateCellFromCsvImport = useCallback(
    async ({
      rowId,
      fieldPath,
      rawValue,
      expectedRawValue,
      importCache,
    }: {
      rowId: string;
      fieldPath: string;
      rawValue: string;
      expectedRawValue: string;
      importCache: Map<string, unknown>;
    }) => {
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);
      const hydrateCell = field?.csv?.backgroundHydrateCell;

      if (!row || !field || !hydrateCell || !rawValue.trim()) {
        completeCsvRowValidationTarget(rowId);
        return;
      }

      try {
        const nextValue = await hydrateCell({
          rawValue,
          row: getRowSubmissionValues(row),
          context,
          importCache,
        });

        const currentCell = findRow(sessionRef.current, rowId)?.cells[fieldPath];
        if (!currentCell || currentCell.rawValue !== expectedRawValue) {
          return;
        }

        scheduleBufferedAsyncResult({
          rowId,
          fieldPath,
          kind: 'value',
          rawValue: nextValue.rawValue,
          displayValue: nextValue.displayValue ?? null,
          parsedValue: nextValue.parsedValue,
        });
      } catch (error) {
        const currentCell = findRow(sessionRef.current, rowId)?.cells[fieldPath];
        if (!currentCell || currentCell.rawValue !== expectedRawValue) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : `Failed to prepare imported ${field.label.toLowerCase()}.`;

        scheduleBufferedAsyncResult({
          rowId,
          fieldPath,
          kind: 'remoteState',
          remoteState: {
            status: RemoteValidationStatus.Invalid,
            suggestions: [],
            selectedSuggestion: null,
            message,
          },
        });
      } finally {
        completeCsvRowValidationTarget(rowId);
      }
    },
    [adapter.fields, completeCsvRowValidationTarget, context, scheduleBufferedAsyncResult]
  );

  const runInlineSuggestionResolution = useCallback(
    async ({ rowId, fieldPath, query }: { rowId: string; fieldPath: string; query: string }) => {
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (!row || !field || !hasSuggestionSource(field)) {
        return;
      }

      const normalizedQuery = query.trim();
      if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
        return;
      }

      if (!normalizedQuery) {
        commit(
          (current) =>
            setCellRemoteState(current, {
              rowId,
              fieldPath,
              remoteState: createIdleRemoteState(),
            }),
          { rowIds: [rowId] }
        );
        return;
      }

      const localSuggestions = filterLocalSuggestions(field.options, normalizedQuery);
      const remoteQuery = hasRemoteQuery(field);
      const remoteQueryFn = field.remote?.query;
      const hasRemoteLookup = Boolean(remoteQuery || field.remote?.evaluate);

      commit(
        (current) =>
          setCellRemoteState(current, {
            rowId,
            fieldPath,
            remoteState: {
              status: hasRemoteLookup
                ? RemoteValidationStatus.Pending
                : RemoteValidationStatus.Idle,
              suggestions: localSuggestions,
              selectedSuggestion: null,
              message: null,
              suggestionPaging: {
                hasNextPage: false,
                isFetchingNextPage: false,
              },
            },
          }),
        { rowIds: [rowId] }
      );

      if (remoteQuery && remoteQueryFn) {
        try {
          const rowValues = getRowSubmissionValues(row);
          const [remoteResult, validationResult] = await Promise.all([
            remoteQueryFn({
              query: normalizedQuery,
              row,
              values: rowValues,
              context,
              pageParam: 0,
              pageSize: ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
            }),
            field.remote?.evaluate
              ? field.remote.evaluate({
                  query: normalizedQuery,
                  value: normalizedQuery,
                  row,
                  values: rowValues,
                  context,
                })
              : Promise.resolve(null),
          ]);

          if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
            return;
          }

          const resolutionCandidates = mergeSuggestions(
            localSuggestions,
            remoteResult.suggestions,
            validationResult?.suggestions,
            validationResult?.resolvedSuggestion ? [validationResult.resolvedSuggestion] : undefined
          );
          const matchedSuggestion = resolveMatchedSuggestion(
            field,
            normalizedQuery,
            validationResult,
            resolutionCandidates
          );
          const allowResolvedSuggestion = field.remote?.autoResolveResolvedSuggestion !== false;
          if (matchedSuggestion) {
            clearValidatorPreviewForCell(rowId, fieldPath);
            commit(
              (current) =>
                resolveCellSuggestion(current, {
                  rowId,
                  fieldPath,
                  suggestion: matchedSuggestion,
                }),
              { rowIds: [rowId] }
            );
            return;
          }

          const previousSelected = findRow(sessionRef.current, rowId)?.cells[fieldPath].remoteState
            .selectedSuggestion;
          const selectedSuggestion =
            previousSelected &&
            resolutionCandidates.some((candidate) => candidate.value === previousSelected.value)
              ? previousSelected
              : null;

          commit(
            (current) =>
              setCellRemoteState(current, {
                rowId,
                fieldPath,
                remoteState: {
                  status:
                    validationResult?.status === RemoteValidationStatus.Valid &&
                    allowResolvedSuggestion
                      ? RemoteValidationStatus.Valid
                      : RemoteValidationStatus.Invalid,
                  suggestions:
                    validationResult?.status === RemoteValidationStatus.Valid &&
                    allowResolvedSuggestion
                      ? []
                      : resolutionCandidates,
                  selectedSuggestion,
                  message:
                    validationResult?.status === RemoteValidationStatus.Valid &&
                    allowResolvedSuggestion
                      ? null
                      : resolveSuggestionMessage(field, validationResult, resolutionCandidates),
                  suggestionPaging: {
                    hasNextPage: remoteResult.nextPageParam !== null,
                    isFetchingNextPage: false,
                  },
                },
              }),
            { rowIds: [rowId] }
          );
        } catch (error) {
          if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : `Failed to load suggestions for ${field.label}.`;

          commit(
            (current) =>
              pushNotification(
                setCellRemoteState(current, {
                  rowId,
                  fieldPath,
                  remoteState: {
                    status: RemoteValidationStatus.Invalid,
                    suggestions: localSuggestions,
                    selectedSuggestion: null,
                    message,
                    suggestionPaging: {
                      hasNextPage: false,
                      isFetchingNextPage: false,
                    },
                  },
                }),
                {
                  id: `notification-${Date.now()}`,
                  tone: NotificationTone.Error,
                  message,
                }
              ),
            { validate: false }
          );
        }
        return;
      }

      if (!field.remote?.evaluate) {
        const matchedSuggestion = resolveMatchedSuggestion(
          field,
          normalizedQuery,
          null,
          localSuggestions
        );
        if (matchedSuggestion) {
          clearValidatorPreviewForCell(rowId, fieldPath);
          commit(
            (current) =>
              resolveCellSuggestion(current, {
                rowId,
                fieldPath,
                suggestion: matchedSuggestion,
              }),
            { rowIds: [rowId] }
          );
          return;
        }

        commit(
          (current) =>
            setCellRemoteState(current, {
              rowId,
              fieldPath,
              remoteState: {
                status: RemoteValidationStatus.Invalid,
                suggestions: localSuggestions,
                selectedSuggestion: null,
                message: resolveSuggestionMessage(field, null, localSuggestions),
                suggestionPaging: {
                  hasNextPage: false,
                  isFetchingNextPage: false,
                },
              },
            }),
          { rowIds: [rowId] }
        );
        return;
      }

      await evaluateCellRemoteConstraint({
        rowId,
        fieldPath,
        query: normalizedQuery,
      });
    },
    [adapter.fields, clearValidatorPreviewForCell, commit, context, evaluateCellRemoteConstraint]
  );

  const clearPendingCellSync = useCallback((rowId: string, fieldPath: string) => {
    const syncKey = `${rowId}:${fieldPath}`;
    const existingTimeout = pendingCellSyncTimeoutsRef.current.get(syncKey);
    if (!existingTimeout) {
      return;
    }

    clearTimeout(existingTimeout);
    pendingCellSyncTimeoutsRef.current.delete(syncKey);
  }, []);

  const scheduleDeferredCellSync = useCallback(
    ({ rowId, fieldPath, rawValue }: { rowId: string; fieldPath: string; rawValue: string }) => {
      const syncKey = `${rowId}:${fieldPath}`;
      clearPendingCellSync(rowId, fieldPath);

      const timeoutId = setTimeout(() => {
        pendingCellSyncTimeoutsRef.current.delete(syncKey);

        const field = findField(adapter.fields, fieldPath);
        if (field && hasSuggestionSource(field)) {
          void runInlineSuggestionResolution({
            rowId,
            fieldPath,
            query: rawValue,
          });
        }
      }, ENTITY_IMPORT_INPUT_SYNC_DELAY_MS);

      pendingCellSyncTimeoutsRef.current.set(syncKey, timeoutId);
    },
    [adapter.fields, clearPendingCellSync, runInlineSuggestionResolution]
  );

  useEffect(() => {
    if (!validatorSuggestionRequest) {
      return;
    }

    const row = findRow(sessionRef.current, validatorSuggestionRequest.rowId);
    const field = findField(adapter.fields, validatorSuggestionRequest.fieldPath);
    if (!row || !field || !hasRemoteQuery(field)) {
      return;
    }

    const localSuggestions = filterLocalSuggestions(
      field.options,
      validatorSuggestionRequest.query
    );
    const currentCell = row.cells[validatorSuggestionRequest.fieldPath];

    if (validatorSuggestionsInfinite.isError) {
      const error = validatorSuggestionsInfinite.error;
      setValidatorSuggestions({
        rowId: validatorSuggestionRequest.rowId,
        fieldPath: validatorSuggestionRequest.fieldPath,
        query: validatorSuggestionRequest.query,
        status: RemoteValidationStatus.Invalid,
        suggestions: localSuggestions,
        selectedSuggestion: currentCell.remoteState.selectedSuggestion,
        message:
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`,
        suggestionPaging: {
          hasNextPage: false,
          isFetchingNextPage: false,
        },
      });
      return;
    }

    if (!validatorSuggestionsInfinite.data) {
      return;
    }

    const remoteSuggestions = validatorSuggestionsInfinite.data.pages.flatMap(
      (page) => page.suggestions
    );
    const suggestions = mergeSuggestions(localSuggestions, remoteSuggestions);
    const normalizedValidatorQuery = validatorSuggestionRequest.query.trim();
    const exactSuggestion = findExactSuggestionMatch(suggestions, normalizedValidatorQuery);
    const autoResolvedSuggestion =
      exactSuggestion ??
      (validatorSuggestionRequest.source === ValidationSource.Validator &&
      field.remote?.evaluate &&
      suggestions.length === 1 &&
      !(validatorSuggestionsInfinite.hasNextPage ?? false)
        ? suggestions[0]
        : null);
    if (
      autoResolvedSuggestion &&
      (currentCell.remoteState.status !== RemoteValidationStatus.Valid ||
        currentCell.remoteState.selectedSuggestion?.value !== autoResolvedSuggestion.value ||
        currentCell.rawValue.trim() !== autoResolvedSuggestion.label.trim())
    ) {
      if (validatorSuggestionRequest.source === ValidationSource.Validator) {
        // validator-sourced: stage as selected suggestion + preview, don't commit to cell.
        // The user must click Apply to commit.
        const previewValue = createValidatorPreviewValueFromSuggestion(autoResolvedSuggestion);
        commit(
          (current) =>
            setCellRemoteState(current, {
              rowId: validatorSuggestionRequest.rowId,
              fieldPath: validatorSuggestionRequest.fieldPath,
              remoteState: {
                ...currentCell.remoteState,
                suggestions,
                status: RemoteValidationStatus.Invalid,
                selectedSuggestion: autoResolvedSuggestion,
                message: 'Apply the selected suggestion to continue.',
              },
            }),
          { rowIds: [validatorSuggestionRequest.rowId] }
        );
        updateValidatorPreview({
          rowId: validatorSuggestionRequest.rowId,
          fieldPath: validatorSuggestionRequest.fieldPath,
          value: doesValidatorDraftMatchCell(currentCell, previewValue) ? null : previewValue,
        });
        setValidatorSuggestions({
          rowId: validatorSuggestionRequest.rowId,
          fieldPath: validatorSuggestionRequest.fieldPath,
          query: validatorSuggestionRequest.query,
          status: RemoteValidationStatus.Invalid,
          suggestions,
          selectedSuggestion: autoResolvedSuggestion,
          message: 'Review the selected option, then apply it to continue.',
          suggestionPaging: {
            hasNextPage: validatorSuggestionsInfinite.hasNextPage ?? false,
            isFetchingNextPage: validatorSuggestionsInfinite.isFetchingNextPage,
          },
        });
        return;
      }

      clearValidatorPreviewForCell(
        validatorSuggestionRequest.rowId,
        validatorSuggestionRequest.fieldPath
      );
      commit(
        (current) =>
          resolveCellSuggestion(current, {
            rowId: validatorSuggestionRequest.rowId,
            fieldPath: validatorSuggestionRequest.fieldPath,
            suggestion: autoResolvedSuggestion,
          }),
        { rowIds: [validatorSuggestionRequest.rowId] }
      );
      setValidatorSuggestions({
        rowId: validatorSuggestionRequest.rowId,
        fieldPath: validatorSuggestionRequest.fieldPath,
        query: validatorSuggestionRequest.query,
        status: RemoteValidationStatus.Valid,
        suggestions,
        selectedSuggestion: autoResolvedSuggestion,
        message: null,
        suggestionPaging: {
          hasNextPage: validatorSuggestionsInfinite.hasNextPage ?? false,
          isFetchingNextPage: validatorSuggestionsInfinite.isFetchingNextPage,
        },
      });
      return;
    }
    const selectedSuggestion =
      currentCell.remoteState.selectedSuggestion &&
      suggestions.some(
        (candidate) => candidate.value === currentCell.remoteState.selectedSuggestion?.value
      )
        ? currentCell.remoteState.selectedSuggestion
        : null;
    const queryMatchesCommittedValue = currentCell.rawValue.trim() === normalizedValidatorQuery;
    const hasResolvedCommittedValue =
      queryMatchesCommittedValue &&
      currentCell.remoteState.status === RemoteValidationStatus.Valid &&
      selectedSuggestion !== null;
    const unresolvedMessage =
      (queryMatchesCommittedValue ? currentCell.remoteState.message : null) ??
      resolveSuggestionMessage(field, null, suggestions);

    setValidatorSuggestions({
      rowId: validatorSuggestionRequest.rowId,
      fieldPath: validatorSuggestionRequest.fieldPath,
      query: validatorSuggestionRequest.query,
      status: hasResolvedCommittedValue
        ? RemoteValidationStatus.Valid
        : RemoteValidationStatus.Invalid,
      suggestions,
      selectedSuggestion,
      message: hasResolvedCommittedValue ? null : unresolvedMessage,
      suggestionPaging: {
        hasNextPage: validatorSuggestionsInfinite.hasNextPage ?? false,
        isFetchingNextPage: validatorSuggestionsInfinite.isFetchingNextPage,
      },
    });
  }, [
    adapter.fields,
    clearValidatorPreviewForCell,
    commit,
    updateValidatorPreview,
    validatorSuggestionRequest,
    validatorSuggestionsInfinite.data,
    validatorSuggestionsInfinite.error,
    validatorSuggestionsInfinite.hasNextPage,
    validatorSuggestionsInfinite.isError,
    validatorSuggestionsInfinite.isFetchingNextPage,
  ]);

  const chooseSuggestion = useCallback(
    ({
      rowId,
      fieldPath,
      suggestion,
    }: {
      rowId: string;
      fieldPath: string;
      suggestion: ISuggestion;
    }) => {
      clearPendingCellSync(rowId, fieldPath);

      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      if (!row) {
        return;
      }

      const currentCell = row.cells[fieldPath];
      const persistedSuggestions =
        validatorSuggestions.rowId === rowId && validatorSuggestions.fieldPath === fieldPath
          ? validatorSuggestions.suggestions
          : currentCell.remoteState.suggestions;
      const previewValue = createValidatorPreviewValueFromSuggestion(suggestion);

      commit(
        (current) =>
          setCellRemoteState(current, {
            rowId,
            fieldPath,
            remoteState: {
              ...currentCell.remoteState,
              suggestions: persistedSuggestions,
              status: RemoteValidationStatus.Invalid,
              selectedSuggestion: suggestion,
              message: 'Apply the selected suggestion to continue.',
            },
          }),
        { rowIds: [rowId] }
      );
      setValidatorSuggestions((current) =>
        current.rowId === rowId && current.fieldPath === fieldPath
          ? {
              ...current,
              suggestions: persistedSuggestions,
              selectedSuggestion: suggestion,
              message: 'Review the selected option, then apply it to continue.',
            }
          : current
      );
      updateValidatorPreview({
        rowId,
        fieldPath,
        value: doesValidatorDraftMatchCell(currentCell, previewValue) ? null : previewValue,
      });
    },
    [clearPendingCellSync, commit, updateValidatorPreview, validatorSuggestions]
  );

  useEffect(() => {
    const { rowId, fieldPath } = session.validatorSelection;

    if (!rowId || !fieldPath || fieldPath === ENTITY_IMPORT_ALL_COLUMNS) {
      clearValidatorSuggestions();
      return;
    }

    const row = findRow(session, rowId);
    const field = findField(adapter.fields, fieldPath);
    const query = row?.cells[fieldPath]?.rawValue ?? '';

    if (!row || !field || !hasSuggestionSource(field) || !query.trim()) {
      clearValidatorSuggestions();
      return;
    }

    const nextQueryKey = `${rowId}:${fieldPath}:${query.trim()}`;
    if (validatorSelectionQueryKeyRef.current === nextQueryKey) {
      return;
    }

    validatorSelectionQueryKeyRef.current = nextQueryKey;
    void requestValidatorSuggestions({
      rowId,
      fieldPath,
      query,
      source: 'selection',
    });
  }, [
    adapter.fields,
    clearValidatorSuggestions,
    requestValidatorSuggestions,
    session,
    session.validatorSelection,
  ]);

  const loadMoreSuggestions = useCallback(() => {
    if (!validatorSuggestionRequest) {
      return;
    }

    void validatorSuggestionsInfinite.fetchNextPage();
  }, [validatorSuggestionRequest, validatorSuggestionsInfinite.fetchNextPage]);

  const selectCell = useCallback(
    ({ rowId, fieldPath }: { rowId: string; fieldPath: string }) => {
      clearValidatorPreview();
      commit((current) => selectCellState(current, { rowId, fieldPath }), {
        validate: false,
      });

      const row = findRow(sessionRef.current, rowId);
      const field = findField(adapter.fields, fieldPath);
      const query = row?.cells[fieldPath]?.rawValue ?? '';
      if (field && hasSuggestionSource(field) && query.trim()) {
        void requestValidatorSuggestions({
          rowId,
          fieldPath,
          query,
          source: 'selection',
        });
      }
    },
    [adapter.fields, clearValidatorPreview, commit, requestValidatorSuggestions]
  );

  const setValidatorSelection = useCallback(
    ({ rowId, fieldPath }: { rowId?: string | null; fieldPath?: string | null }) => {
      clearValidatorPreview();
      commit((current) => setValidatorSelectionState(current, { rowId, fieldPath }), {
        validate: false,
      });
    },
    [clearValidatorPreview, commit]
  );

  const updateCellValue = useCallback(
    ({ rowId, fieldPath, rawValue }: { rowId: string; fieldPath: string; rawValue: string }) => {
      clearValidatorPreview();
      resetImportRun();
      commit((current) => updateCellRawValue(current, { rowId, fieldPath, rawValue }), {
        rowIds: [rowId],
      });
      scheduleDeferredCellSync({ rowId, fieldPath, rawValue });
    },
    [clearValidatorPreview, commit, resetImportRun, scheduleDeferredCellSync]
  );

  const setFileValue = useCallback(
    ({
      rowId,
      fieldPath,
      files,
      displayValue,
    }: {
      rowId: string;
      fieldPath: string;
      files: Array<File>;
      displayValue?: string | null;
    }) => {
      const field = findField(adapter.fields, fieldPath);
      const validationError = validateImportFiles({ field, files });
      if (validationError) {
        commit(
          (current) =>
            pushNotification(current, {
              id: `notification-${Date.now()}`,
              tone: NotificationTone.Error,
              message: validationError,
            }),
          { validate: false }
        );
        return;
      }

      const nextRawValue = displayValue ?? getImportFileDisplayValue(files);
      const resolvedDisplayValue = nextRawValue || null;
      clearValidatorPreview();
      resetImportRun();
      commit(
        (current) =>
          setCellValue(current, {
            rowId,
            fieldPath,
            rawValue: nextRawValue,
            displayValue: resolvedDisplayValue,
            parsedValue: toParsedFileValue(files, field),
          }),
        { rowIds: [rowId] }
      );
    },
    [adapter.fields, clearValidatorPreview, commit, resetImportRun]
  );

  const setCustomValue = useCallback(
    ({
      rowId,
      fieldPath,
      rawValue,
      displayValue,
      parsedValue,
    }: {
      rowId: string;
      fieldPath: string;
      rawValue: string;
      displayValue?: string | null;
      parsedValue?: unknown;
    }) => {
      clearPendingCellSync(rowId, fieldPath);
      clearValidatorPreview();
      resetImportRun();
      commit(
        (current) =>
          setCellValue(current, {
            rowId,
            fieldPath,
            rawValue,
            displayValue,
            parsedValue,
          }),
        { rowIds: [rowId] }
      );
    },
    [clearPendingCellSync, clearValidatorPreview, commit, resetImportRun]
  );

  const addRow = useCallback(() => {
    const blankRow = adapter.createBlankRow?.();
    clearValidatorPreview();
    resetImportRun();
    commit((current) => appendEmptyRow(current, blankRow));
  }, [adapter, clearValidatorPreview, commit, resetImportRun]);

  const clearRow = useCallback(
    (rowId: string) => {
      const blankRow = adapter.createBlankRow?.();
      clearValidatorPreview();
      resetImportRun();
      commit((current) => clearSessionRow(current, { rowId, values: blankRow }), {
        rowIds: [rowId],
      });
    },
    [adapter, clearValidatorPreview, commit, resetImportRun]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      clearValidatorPreview();
      resetImportRun();
      commit((current) => deleteSessionRow(current, { rowId }));
    },
    [clearValidatorPreview, commit, resetImportRun]
  );

  const applySuggestion = useCallback(
    (params: Parameters<IEntityImportActions['applySuggestion']>[0]) => {
      clearPendingCellSync(params.targetRowId, params.fieldPath);
      clearValidatorPreview();
      resetImportRun();
      commit(
        (current) =>
          params.mode === ValidatorManualApplyMode.Stage
            ? stageSuggestionToRows(current, params)
            : resolveSuggestionToRows(current, params),
        {
          rowIds: params.applyToAllMatching
            ? sessionRef.current.rows.map((row) => row.id)
            : [params.targetRowId],
        }
      );
    },
    [clearPendingCellSync, clearValidatorPreview, commit, resetImportRun]
  );

  const acceptCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      clearPendingCellSync(params.rowId, params.fieldPath);
      clearValidatorPreview();
      resetImportRun();
      commit((current) => acceptCorrectionDraft(current, params), {
        rowIds: [params.rowId],
      });
    },
    [clearPendingCellSync, clearValidatorPreview, commit, resetImportRun]
  );

  const rejectCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      clearPendingCellSync(params.rowId, params.fieldPath);
      clearValidatorPreview();
      resetImportRun();
      commit((current) => rejectCorrectionDraft(current, params), {
        rowIds: [params.rowId],
      });
    },
    [clearPendingCellSync, clearValidatorPreview, commit, resetImportRun]
  );

  const applyManualValueToAll = useCallback(
    (params: {
      fieldPath: string;
      targetRowIds: Array<string>;
      rawValue: string;
      displayValue?: string | null;
      parsedValue?: unknown;
    }) => {
      clearValidatorPreview();
      resetImportRun();
      commit((current) => applyValueToRows(current, params), {
        rowIds: params.targetRowIds,
      });
    },
    [clearValidatorPreview, commit, resetImportRun]
  );

  const dismissFeatureNotification = useCallback(
    (notificationId: string) => {
      commit((current) => dismissNotification(current, notificationId), {
        validate: false,
      });
    },
    [commit]
  );

  const handleCsvUpload = useCallback(
    async (file: File) => {
      try {
        clearValidatorPreview();
        resetImportRun();
        setCsvUploadPhase(CsvUploadPhase.Parsing);
        setCsvUploadNotifications([]);
        resetCsvRowValidationProgress();
        clearValidatorSuggestions();
        const parsedCsv = await parseCsvFile(file);
        setCsvUploadPhase(CsvUploadPhase.Hydrating);
        const imported = importCsvRows({
          fields: adapter.fields,
          rows: parsedCsv.data,
        });
        const importCache = new Map<string, unknown>();
        const csvHydratedRows = await hydrateCsvRows({
          fields: adapter.fields,
          rows: imported.rows,
          context,
          importCache,
        });
        setCsvUploadPhase(CsvUploadPhase.PreparingRows);
        const csvUploadNotifications = buildCsvParseNotificationMessages(parsedCsv);
        setCsvUploadNotifications(csvUploadNotifications);
        const hydratedSession = validate(
          hydrateSessionRows(sessionRef.current, {
            rows: csvHydratedRows,
            strippedColumns: imported.strippedColumns,
          })
        );
        const backgroundHydrationTargets = hydratedSession.rows.flatMap((row) =>
          adapter.fields.flatMap((field) => {
            const importRawValue = imported.rows[row.rowIndex]?.[field.path] ?? '';
            const expectedRawValue = row.cells[field.path]?.rawValue ?? '';
            if (!field.csv?.backgroundHydrateCell || !importRawValue.trim()) {
              return [];
            }

            return [
              {
                rowId: row.id,
                fieldPath: field.path,
                rawValue: importRawValue,
                expectedRawValue,
              },
            ];
          })
        );
        const remoteValidationTargets = hydratedSession.rows.flatMap((row) =>
          adapter.fields.flatMap((field) => {
            const query = row.cells[field.path]?.rawValue.trim();
            if (!field.remote?.evaluate || !query) {
              return [];
            }

            return [{ rowId: row.id, fieldPath: field.path, query }];
          })
        );
        const pendingTargets = [...backgroundHydrationTargets, ...remoteValidationTargets];
        const pendingSession = pendingTargets.reduce(
          (current, { rowId, fieldPath }) =>
            setCellRemoteState(current, {
              rowId,
              fieldPath,
              remoteState: {
                status: RemoteValidationStatus.Pending,
                suggestions: [],
                selectedSuggestion: null,
                message: null,
                suggestionPaging: {
                  hasNextPage: false,
                  isFetchingNextPage: false,
                },
              },
            }),
          hydratedSession
        );

        beginCsvRowValidationProgress(pendingTargets);
        setCsvUploadPhase(CsvUploadPhase.Idle);
        sessionRef.current = pendingSession;
        setSession(pendingSession);

        backgroundHydrationTargets.forEach((target) => {
          void backgroundQueueLimitRef.current(() =>
            hydrateCellFromCsvImport({
              ...target,
              importCache,
            })
          );
        });

        remoteValidationTargets.forEach((target) => {
          void backgroundQueueLimitRef.current(() =>
            evaluateCellRemoteConstraint({
              ...target,
              notifyOnError: false,
              buffered: true,
            })
          );
        });
      } catch (error) {
        setCsvUploadPhase(CsvUploadPhase.Idle);
        resetCsvRowValidationProgress();
        setCsvUploadNotifications([
          {
            id: 'csv-upload-error',
            tone: NotificationTone.Error,
            message:
              error instanceof Error ? error.message : 'Failed to parse the uploaded CSV file.',
          },
        ]);
      }
    },
    [
      adapter.fields,
      beginCsvRowValidationProgress,
      clearValidatorPreview,
      clearValidatorSuggestions,
      context,
      resetImportRun,
      resetCsvRowValidationProgress,
      hydrateCellFromCsvImport,
      evaluateCellRemoteConstraint,
      validate,
    ]
  );

  const downloadCsvTemplate = useCallback(() => {
    const csv = Papa.unparse({
      fields: buildTemplateColumns(adapter.fields),
      data: [],
    });

    downloadBlob({
      content: csv,
      type: 'text/csv;charset=utf-8;',
      fileName: adapter.templateFileName,
    });
  }, [adapter.fields, adapter.templateFileName]);

  const downloadCurrentCsv = useCallback(() => {
    const exportableFields = adapter.fields.filter((field) => field.csv?.include !== false);
    const csv = Papa.unparse({
      fields: exportableFields.map((field) => field.label),
      data: sessionRef.current.rows.map((row) =>
        exportableFields.map((field) => row.cells[field.path]?.rawValue ?? '')
      ),
    });

    downloadBlob({
      content: csv,
      type: 'text/csv;charset=utf-8;',
      fileName: buildCurrentCsvFileName(adapter.templateFileName),
    });
  }, [adapter.fields, adapter.templateFileName]);

  const downloadGuideTemplate = useCallback(() => {
    const templateGuide = getEntityImportTemplateGuide(adapter.templateGuide);
    if (!templateGuide) {
      commit(
        (current) =>
          pushNotification(current, {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Error,
            message: 'No import guide is available for this artifact type.',
          }),
        { validate: false }
      );
      return;
    }

    downloadBlob({
      content: templateGuide.content,
      type: 'text/markdown;charset=utf-8;',
      fileName: templateGuide.fileName,
    });
  }, [adapter.templateGuide, commit]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const current = sessionRef.current;
      if (!current.summary.canSubmit) {
        throw new Error('Cannot import until validation passes.');
      }

      beginImportRun(current.rows);

      try {
        const submitLimit = pLimit(ENTITY_IMPORT_SUBMIT_QUEUE_CONCURRENCY);
        const results = await Promise.all(
          current.rows.map((row) =>
            submitLimit(async () => {
              markImportRowPending(row.id);

              try {
                const values = getRowSubmissionValues(row);
                const payload = adapter.buildPayload({ row, values, context });
                await adapter.submitRow({
                  payload,
                  row,
                  values,
                  context,
                });
                markImportRowCompleted({ row, errorMessage: null });

                return { ok: true as const };
              } catch (error) {
                const errorMessage = getImportFailureMessage(error, row);
                markImportRowCompleted({ row, errorMessage });

                return {
                  ok: false as const,
                  rowNumber: row.rowIndex + 1,
                  message: errorMessage,
                };
              }
            })
          )
        );
        const failureCards = results
          .filter(
            (result): result is { ok: false; rowNumber: number; message: string } => !result.ok
          )
          .sort((left, right) => left.rowNumber - right.rowNumber);

        return {
          rowCount: current.rows.length,
          succeededRowCount: current.rows.length - failureCards.length,
          failedRowCount: failureCards.length,
          failureCards,
        };
      } finally {
        completeImportRun();
      }
    },
    onSuccess: () => {},
    onError: (error) => {
      commit(
        (current) =>
          pushNotification(current, {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Error,
            message: error instanceof Error ? error.message : 'One or more rows failed to import.',
          }),
        { validate: false }
      );
    },
  });

  const submitRows = useCallback(() => {
    if (
      !sessionRef.current.summary.canSubmit ||
      (validatorPreview.rowId !== null && validatorPreview.fieldPath !== null)
    ) {
      return;
    }

    importMutation.mutate();
  }, [importMutation, validatorPreview.fieldPath, validatorPreview.rowId]);

  const actions = useMemo<IEntityImportActions>(
    () => ({
      addRow,
      applySuggestion,
      acceptCorrection,
      rejectCorrection,
      chooseSuggestion,
      clearRow,
      deleteRow,
      dismissNotification: dismissFeatureNotification,
      requestSuggestions: (params) =>
        requestValidatorSuggestions({ ...params, source: 'validator' }),
      loadMoreSuggestions,
      selectCell,
      setValidatorSelection,
      setValidatorPreview: updateValidatorPreview,
      setCustomValue,
      setFileValue,
      submitRows,
      updateCellValue,
      applyManualValueToAll,
    }),
    [
      addRow,
      applySuggestion,
      acceptCorrection,
      rejectCorrection,
      chooseSuggestion,
      clearRow,
      deleteRow,
      dismissFeatureNotification,
      requestValidatorSuggestions,
      loadMoreSuggestions,
      selectCell,
      setValidatorSelection,
      updateValidatorPreview,
      setCustomValue,
      setFileValue,
      submitRows,
      updateCellValue,
      applyManualValueToAll,
    ]
  );

  const fieldStatusMap = useMemo(
    () => computeFieldStatusMap(session.rows, adapter.fields),
    [session.rows, adapter.fields]
  );

  const rowsSummaryStatus = useMemo(
    () => computeRowsSummaryStatus(session.rows, adapter.fields),
    [session.rows, adapter.fields]
  );

  return {
    session,
    actions,
    isSubmitting: importMutation.isPending,
    importRun,
    csvUploadPhase,
    csvRowValidationProgress,
    csvUploadNotifications,
    validatorPreview,
    validatorSuggestions,
    fieldStatusMap,
    rowsSummaryStatus,
    dismissCsvUploadNotifications,
    downloadCsvTemplate,
    downloadCurrentCsv,
    downloadGuideTemplate,
    handleCsvUpload,
  };
}
