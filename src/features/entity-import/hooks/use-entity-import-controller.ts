'use client';

import { useMutation } from '@tanstack/react-query';
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
  ValidatorWriteStrategy,
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
import {
  mergeSuggestions,
  useValidatorRemoteSuggestions,
} from '@/features/entity-import/hooks/use-validator-remote-suggestions';
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
  if (!renamedHeaders || typeof renamedHeaders !== 'object') return [];
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
      rows.map((row) => [row.id, { status: ImportRowResultStatus.Idle, errorMessage: null }])
    ),
    failureCards: [],
  };
}

function getImportFailureMessage(error: unknown, row: IImportRowState): string {
  if (error instanceof Error && error.message.trim()) return error.message;
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
            if (!field.csv?.hydrateCell) return;
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

function hasSuggestionSource(field?: IAdapterFieldDefinition): boolean {
  return fieldHasSuggestionResolution(field);
}

function filterLocalSuggestions(
  suggestions: Array<ISuggestion> | undefined,
  query: string
): Array<ISuggestion> {
  const q = query.trim().toLowerCase();
  if (!q || !suggestions?.length) return [];
  return suggestions
    .filter((s) => `${s.label} ${s.description ?? ''}`.toLowerCase().includes(q))
    .slice(0, 12);
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
  if (validationResult?.message) return validationResult.message;
  if (suggestions.length > 0) return 'Choose the closest suggestion and apply it.';
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

const AsyncResultBufferKind = {
  Value: 'value',
  RemoteState: 'remoteState',
  Suggestion: 'suggestion',
} as const;

function createIdleCsvRowValidationProgress(): CsvRowValidationProgress {
  return { active: false, totalRowCount: 0, completedRowCount: 0 };
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

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const commit = useCallback(
    (
      updater: (current: IImportSessionState) => IImportSessionState,
      options?: { validate?: boolean; rowIds?: Array<string> }
    ) => {
      setSession((current) => {
        const next = updater(current);
        const resolved = options?.validate === false ? next : validate(next, options?.rowIds);
        sessionRef.current = resolved;
        return resolved;
      });
    },
    [validate]
  );

  const [validatorPreview, setValidatorPreviewState] = useState<IValidatorPreviewState>(
    createIdleValidatorPreviewState
  );

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

  const validatorRemote = useValidatorRemoteSuggestions({
    adapter,
    context,
    sessionRef,
    commit,
    updateValidatorPreview,
    clearValidatorPreviewForCell,
  });

  const [importRun, setImportRun] = useState<IImportRunState>(createIdleImportRunState);

  const resetImportRun = useCallback(() => {
    setImportRun(createIdleImportRunState());
  }, []);

  const beginImportRun = useCallback((rows: Array<IImportRowState>) => {
    setImportRun(createRunningImportRunState(rows));
  }, []);

  const markImportRowPending = useCallback((rowId: string) => {
    setImportRun((current) => {
      if (current.phase !== ImportRunPhase.Running) return current;
      const previous = current.rowResults[rowId];
      if (!previous || previous.status === ImportRowResultStatus.Pending) return current;
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
        if (current.phase !== ImportRunPhase.Running) return current;
        const previous = current.rowResults[row.id];
        if (!previous) return current;
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
              ].sort((a, b) => a.rowNumber - b.rowNumber)
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
    setImportRun((current) =>
      current.phase === ImportRunPhase.Running
        ? { ...current, phase: ImportRunPhase.Completed }
        : current
    );
  }, []);

  const [csvUploadPhase, setCsvUploadPhase] = useState<TCsvUploadPhase>(CsvUploadPhase.Idle);
  const [csvRowValidationProgress, setCsvRowValidationProgress] =
    useState<CsvRowValidationProgress>(createIdleCsvRowValidationProgress);
  const [csvUploadNotifications, setCsvUploadNotifications] = useState<
    Array<CsvUploadNotification>
  >([]);
  const csvRowValidationPendingCountsRef = useRef<Map<string, number>>(new Map());

  const resetCsvRowValidationProgress = useCallback(() => {
    csvRowValidationPendingCountsRef.current = new Map();
    setCsvRowValidationProgress(createIdleCsvRowValidationProgress());
  }, []);

  const dismissCsvUploadNotifications = useCallback(() => {
    setCsvUploadNotifications([]);
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
    const count = pendingCounts.get(rowId);
    if (count === undefined) return;
    if (count > 1) {
      pendingCounts.set(rowId, count - 1);
      return;
    }
    pendingCounts.delete(rowId);
    setCsvRowValidationProgress((current) => {
      const completedRowCount = current.completedRowCount + 1;
      return completedRowCount >= current.totalRowCount
        ? createIdleCsvRowValidationProgress()
        : { ...current, completedRowCount };
    });
  }, []);

  const backgroundQueueLimitRef = useRef(pLimit(ENTITY_IMPORT_BACKGROUND_QUEUE_CONCURRENCY));
  const asyncResultBufferRef = useRef<
    Map<
      string,
      { rowId: string; fieldPath: string } & (
        | {
            kind: typeof AsyncResultBufferKind.Value;
            rawValue: string;
            displayValue: string | null;
            parsedValue: unknown;
          }
        | {
            kind: typeof AsyncResultBufferKind.RemoteState;
            remoteState: IImportCellState['remoteState'];
          }
        | {
            kind: typeof AsyncResultBufferKind.Suggestion;
            suggestion: ISuggestion;
          }
      )
    >
  >(new Map());
  const asyncFlushFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

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
              let s = current;
              for (const e of entries) {
                if (e.kind === AsyncResultBufferKind.Value) {
                  s = setCellValue(s, {
                    rowId: e.rowId,
                    fieldPath: e.fieldPath,
                    rawValue: e.rawValue,
                    displayValue: e.displayValue,
                    parsedValue: e.parsedValue,
                  });
                } else if (e.kind === AsyncResultBufferKind.RemoteState) {
                  s = setCellRemoteState(s, {
                    rowId: e.rowId,
                    fieldPath: e.fieldPath,
                    remoteState: e.remoteState,
                  });
                } else if (e.kind === AsyncResultBufferKind.Suggestion) {
                  s = resolveCellSuggestion(s, {
                    rowId: e.rowId,
                    fieldPath: e.fieldPath,
                    suggestion: e.suggestion,
                  });
                }
              }
              return s;
            },
            { rowIds: affectedRowIds }
          );
        });
      }
    },
    [commit]
  );

  const pendingCellSyncTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearPendingCellSync = useCallback((rowId: string, fieldPath: string) => {
    const syncKey = `${rowId}:${fieldPath}`;
    const existing = pendingCellSyncTimeoutsRef.current.get(syncKey);
    if (!existing) return;
    clearTimeout(existing);
    pendingCellSyncTimeoutsRef.current.delete(syncKey);
  }, []);

  useEffect(() => {
    return () => {
      pendingCellSyncTimeoutsRef.current.forEach(clearTimeout);
      pendingCellSyncTimeoutsRef.current.clear();
      if (asyncFlushFrameRef.current !== null) {
        cancelAnimationFrame(asyncFlushFrameRef.current);
        asyncFlushFrameRef.current = null;
      }
      asyncResultBufferRef.current.clear();
    };
  }, []);

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
      const row = findRow(sessionRef.current, rowId);
      const field = findField(adapter.fields, fieldPath);
      const normalizedQuery = query.trim();

      if (!row || !field?.remote?.evaluate || !normalizedQuery) return;

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

        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) return;

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
              kind: AsyncResultBufferKind.Suggestion,
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

        const isValidResolved =
          validationResult.status === RemoteValidationStatus.Valid && allowResolvedSuggestion;
        const suggestions = isValidResolved ? [] : resolutionCandidates;
        const remoteState: IImportCellState['remoteState'] = {
          status: isValidResolved ? RemoteValidationStatus.Valid : RemoteValidationStatus.Invalid,
          suggestions,
          selectedSuggestion: null,
          message: isValidResolved
            ? null
            : resolveSuggestionMessage(field, validationResult, suggestions),
        };

        if (buffered) {
          scheduleBufferedAsyncResult({
            rowId,
            fieldPath,
            kind: AsyncResultBufferKind.RemoteState,
            remoteState,
          });
        } else {
          commit((current) => setCellRemoteState(current, { rowId, fieldPath, remoteState }), {
            rowIds: [rowId],
          });
        }
      } catch (error) {
        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) return;

        const message =
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`;
        const errorRemoteState: IImportCellState['remoteState'] = {
          status: RemoteValidationStatus.Invalid,
          suggestions: localSuggestions,
          selectedSuggestion: null,
          message,
        };

        if (!notifyOnError) {
          if (buffered) {
            scheduleBufferedAsyncResult({
              rowId,
              fieldPath,
              kind: AsyncResultBufferKind.RemoteState,
              remoteState: errorRemoteState,
            });
          } else {
            commit(
              (current) =>
                setCellRemoteState(current, {
                  rowId,
                  fieldPath,
                  remoteState: errorRemoteState,
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
                remoteState: errorRemoteState,
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
      const row = findRow(sessionRef.current, rowId);
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
        if (!currentCell || currentCell.rawValue !== expectedRawValue) return;

        scheduleBufferedAsyncResult({
          rowId,
          fieldPath,
          kind: AsyncResultBufferKind.Value,
          rawValue: nextValue.rawValue,
          displayValue: nextValue.displayValue ?? null,
          parsedValue: nextValue.parsedValue,
        });
      } catch (error) {
        const currentCell = findRow(sessionRef.current, rowId)?.cells[fieldPath];
        if (!currentCell || currentCell.rawValue !== expectedRawValue) return;

        const message =
          error instanceof Error
            ? error.message
            : `Failed to prepare imported ${field.label.toLowerCase()}.`;

        scheduleBufferedAsyncResult({
          rowId,
          fieldPath,
          kind: AsyncResultBufferKind.RemoteState,
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

  const resolveInlineCellSuggestions = useCallback(
    async ({ rowId, fieldPath, query }: { rowId: string; fieldPath: string; query: string }) => {
      const row = findRow(sessionRef.current, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (!row || !field || !hasSuggestionSource(field)) return;

      const normalizedQuery = query.trim();
      if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) return;

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
      const remoteQueryFn = field.remote?.query;
      const hasRemoteLookup = Boolean(remoteQueryFn || field.remote?.evaluate);

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

      if (remoteQueryFn) {
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

          if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) return;

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
            previousSelected && resolutionCandidates.some((c) => c.value === previousSelected.value)
              ? previousSelected
              : null;
          const isValidResolved =
            validationResult?.status === RemoteValidationStatus.Valid && allowResolvedSuggestion;

          commit(
            (current) =>
              setCellRemoteState(current, {
                rowId,
                fieldPath,
                remoteState: {
                  status: isValidResolved
                    ? RemoteValidationStatus.Valid
                    : RemoteValidationStatus.Invalid,
                  suggestions: isValidResolved ? [] : resolutionCandidates,
                  selectedSuggestion,
                  message: isValidResolved
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
          if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) return;

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

  const scheduleDeferredCellSync = useCallback(
    ({ rowId, fieldPath, rawValue }: { rowId: string; fieldPath: string; rawValue: string }) => {
      const syncKey = `${rowId}:${fieldPath}`;
      clearPendingCellSync(rowId, fieldPath);

      const timeoutId = setTimeout(() => {
        pendingCellSyncTimeoutsRef.current.delete(syncKey);
        const field = findField(adapter.fields, fieldPath);
        if (field && hasSuggestionSource(field)) {
          void resolveInlineCellSuggestions({
            rowId,
            fieldPath,
            query: rawValue,
          });
        }
      }, ENTITY_IMPORT_INPUT_SYNC_DELAY_MS);

      pendingCellSyncTimeoutsRef.current.set(syncKey, timeoutId);
    },
    [adapter.fields, clearPendingCellSync, resolveInlineCellSuggestions]
  );

  const validatorSelectionQueryKeyRef = useRef('');

  const {
    clearSuggestions,
    requestSuggestions: requestValidatorSuggestions,
    chooseSuggestion: chooseValidatorSuggestion,
    loadMoreSuggestions,
    suggestions: validatorSuggestions,
  } = validatorRemote;

  useEffect(() => {
    const { rowId, fieldPath } = session.validatorSelection;

    if (!rowId || !fieldPath || fieldPath === ENTITY_IMPORT_ALL_COLUMNS) {
      validatorSelectionQueryKeyRef.current = '';
      clearSuggestions();
      return;
    }

    const row = session.rows.find((r) => r.id === rowId);
    const field = findField(adapter.fields, fieldPath);
    const query = row?.cells[fieldPath]?.rawValue ?? '';

    if (!row || !field || !hasSuggestionSource(field) || !query.trim()) {
      validatorSelectionQueryKeyRef.current = '';
      clearSuggestions();
      return;
    }

    const nextQueryKey = `${rowId}:${fieldPath}:${query.trim()}`;
    if (validatorSelectionQueryKeyRef.current === nextQueryKey) return;

    // when the cell's remote state has already been resolved by the inline
    // path or csv background validation, skip the remote fetch, the
    // suggestions are already in (cell.remoteState) and the validator panel
    // reads them as a fallback, only re-fetch when the cell is Idle
    // (never validated) or Pending (in-flight, will land on its own)
    const cell = row.cells[fieldPath];
    if (
      cell.remoteState.status !== RemoteValidationStatus.Idle &&
      cell.remoteState.status !== RemoteValidationStatus.Pending
    ) {
      validatorSelectionQueryKeyRef.current = nextQueryKey;
      return;
    }

    validatorSelectionQueryKeyRef.current = nextQueryKey;
    requestValidatorSuggestions({
      rowId,
      fieldPath,
      query,
      source: 'selection',
    });
  }, [
    adapter.fields,
    session.validatorSelection,
    // we intentionally depend on session.rows to pick up rawValue changes
    // from inline edits that should refresh the validator panel.
    session.rows,
    clearSuggestions,
    requestValidatorSuggestions,
  ]);

  const onSelectCell = useCallback(
    ({ rowId, fieldPath }: { rowId: string; fieldPath: string }) => {
      const current = sessionRef.current;
      // skip if the cell is already selected, avoids clearing an active
      // validator preview (e.g. when tabbing between inputs within a
      // compound field like LocationEditor)
      if (current.selectedCell?.rowId === rowId && current.selectedCell?.fieldPath === fieldPath) {
        return;
      }

      clearValidatorPreview();
      // only commit the selection, the effect above handles suggestion sync
      commit((current) => selectCellState(current, { rowId, fieldPath }), {
        validate: false,
      });
    },
    [clearValidatorPreview, commit]
  );

  const onSetValidatorSelection = useCallback(
    ({ rowId, fieldPath }: { rowId?: string | null; fieldPath?: string | null }) => {
      clearValidatorPreview();
      commit((current) => setValidatorSelectionState(current, { rowId, fieldPath }), {
        validate: false,
      });
    },
    [clearValidatorPreview, commit]
  );

  const onUpdateCellValue = useCallback(
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

  const onSetFileValue = useCallback(
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
      clearValidatorPreview();
      resetImportRun();
      commit(
        (current) =>
          setCellValue(current, {
            rowId,
            fieldPath,
            rawValue: nextRawValue,
            displayValue: nextRawValue || null,
            parsedValue: toParsedFileValue(files, field),
          }),
        { rowIds: [rowId] }
      );
    },
    [adapter.fields, clearValidatorPreview, commit, resetImportRun]
  );

  const onSetCustomValue = useCallback(
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

  const onAddRow = useCallback(() => {
    const blankRow = adapter.createBlankRow?.();
    clearValidatorPreview();
    resetImportRun();
    commit((current) => appendEmptyRow(current, blankRow));
  }, [adapter, clearValidatorPreview, commit, resetImportRun]);

  const onClearRow = useCallback(
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

  const onDeleteRow = useCallback(
    (rowId: string) => {
      clearValidatorPreview();
      resetImportRun();
      commit((current) => deleteSessionRow(current, { rowId }));
    },
    [clearValidatorPreview, commit, resetImportRun]
  );

  const onApplySuggestion = useCallback(
    (params: Parameters<IEntityImportActions['onApplySuggestion']>[0]) => {
      clearPendingCellSync(params.targetRowId, params.fieldPath);
      clearValidatorPreview();
      resetImportRun();
      commit(
        (current) =>
          params.mode === ValidatorWriteStrategy.Stage
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

  const onAcceptCorrection = useCallback(
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

  const onRejectCorrection = useCallback(
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

  const onApplyManualValueToAll = useCallback(
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

  const onDismissFeatureNotification = useCallback(
    (notificationId: string) => {
      commit((current) => dismissNotification(current, notificationId), {
        validate: false,
      });
    },
    [commit]
  );

  const onHandleCsvUpload = useCallback(
    async (file: File) => {
      try {
        clearValidatorPreview();
        resetImportRun();
        setCsvUploadPhase(CsvUploadPhase.Parsing);
        setCsvUploadNotifications([]);
        resetCsvRowValidationProgress();
        clearSuggestions();

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
        setCsvUploadNotifications(buildCsvParseNotificationMessages(parsedCsv));

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
            if (!field.csv?.backgroundHydrateCell || !importRawValue.trim()) return [];
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
            if (!field.remote?.evaluate || !query) return [];
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
            hydrateCellFromCsvImport({ ...target, importCache })
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
      clearSuggestions,
      context,
      resetImportRun,
      resetCsvRowValidationProgress,
      hydrateCellFromCsvImport,
      evaluateCellRemoteConstraint,
      validate,
    ]
  );

  const onDownloadCsvTemplate = useCallback(() => {
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

  const onDownloadCurrentCsv = useCallback(() => {
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

  const onDownloadGuideTemplate = useCallback(() => {
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
                await adapter.submitRow({ payload, row, values, context });
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
          .filter((r): r is { ok: false; rowNumber: number; message: string } => !r.ok)
          .sort((a, b) => a.rowNumber - b.rowNumber);

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
    onError: (error: unknown) => {
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

  const onSubmitRows = useCallback(() => {
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
      onAddRow,
      onApplySuggestion,
      onAcceptCorrection,
      onRejectCorrection,
      chooseSuggestion: (params) => {
        clearPendingCellSync(params.rowId, params.fieldPath);
        chooseValidatorSuggestion(params);
      },
      onClearRow,
      onDeleteRow,
      onDismissFeatureNotification,
      requestSuggestions: async (params) => {
        requestValidatorSuggestions({ ...params, source: 'validator' });
      },
      loadMoreSuggestions,
      onSelectCell,
      onSetValidatorSelection,
      updateValidatorPreview,
      onSetCustomValue,
      onSetFileValue,
      onSubmitRows,
      onUpdateCellValue,
      onApplyManualValueToAll,
    }),
    [
      onAddRow,
      onApplySuggestion,
      onAcceptCorrection,
      onRejectCorrection,
      clearPendingCellSync,
      chooseValidatorSuggestion,
      requestValidatorSuggestions,
      loadMoreSuggestions,
      onClearRow,
      onDeleteRow,
      onDismissFeatureNotification,
      onSelectCell,
      onSetValidatorSelection,
      updateValidatorPreview,
      onSetCustomValue,
      onSetFileValue,
      onSubmitRows,
      onUpdateCellValue,
      onApplyManualValueToAll,
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
    onDownloadCsvTemplate,
    onDownloadCurrentCsv,
    onDownloadGuideTemplate,
    onHandleCsvUpload,
  };
}
