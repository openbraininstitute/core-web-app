'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import pLimit from 'p-limit';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getEntityImportTemplateGuide } from '@/features/entity-import/templates/registry';

import {
  type CsvHydratedCellValue,
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  type EntityImportRuntimeContext,
  type IAdapterFieldDefinition,
  type IEntityImportActions,
  type IEntityImportAdapter,
  type IValidatorSuggestionState,
  type RemoteValidationResult,
} from '../core/adapter';
import {
  createIdleRemoteState,
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportRowState,
  type IImportSessionState,
  type ISuggestion,
  NotificationTone,
  RemoteValidationStatus,
  type TFlatImportValues,
} from '../core/contracts';
import { buildTemplateColumns, importCsvRows, parseCsvFile } from '../core/csv';
import {
  getImportFileDisplayValue,
  toParsedFileValue,
  validateImportFiles,
} from '../core/file-field';
import {
  fieldHasSuggestionResolution,
  findExactSuggestionMatch,
  getRowSubmissionValues,
} from '../core/helpers';
import {
  acceptCorrectionDraft,
  appendEmptyRow,
  clearRow as clearSessionRow,
  createImportSessionState,
  deleteRow as deleteSessionRow,
  dismissNotification,
  hydrateSessionRows,
  pushNotification,
  rejectCorrectionDraft,
  resolveCellSuggestion,
  selectCell as selectCellState,
  setCellRemoteState,
  setCellValue,
  setValidatorSelection as setValidatorSelectionState,
  stageSuggestionToRows,
  updateCellRawValue,
} from '../core/session';
import { validateSessionRows } from '../core/validation';

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

async function hydrateCsvRows({
  fields,
  rows,
  context,
  importCache,
}: {
  fields: Array<IAdapterFieldDefinition>;
  rows: Array<TFlatImportValues>;
  context: EntityImportRuntimeContext;
  importCache?: Map<string, unknown>;
}) {
  const limit = pLimit(6);

  return Promise.all(
    rows.map((row) =>
      limit(async () => {
        const nextRow = { ...row } as Record<string, string | CsvHydratedCellValue>;

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
  validationResult: RemoteValidationResult | null,
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
  validationResult: RemoteValidationResult | null,
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
  context: EntityImportRuntimeContext;
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
    source: 'selection' | 'validator';
  } | null>(null);
  const validatorSuggestionRequestRef = useRef(validatorSuggestionRequest);
  const [validatorSuggestions, setValidatorSuggestions] = useState<IValidatorSuggestionState>(() =>
    createIdleValidatorSuggestionState()
  );
  const validatorSelectionQueryKeyRef = useRef('');
  const pendingCellSyncTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const backgroundQueueLimitRef = useRef(pLimit(ENTITY_IMPORT_BACKGROUND_QUEUE_CONCURRENCY));

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
        return { suggestions: [] as Array<ISuggestion>, nextPageParam: null as number | null };
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
      setValidatorSuggestionRequest({ rowId, fieldPath, query: normalizedQuery, source });
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

  const runDirectRemoteValidation = useCallback(
    async ({
      rowId,
      fieldPath,
      query,
      notifyOnError = true,
    }: {
      rowId: string;
      fieldPath: string;
      query: string;
      notifyOnError?: boolean;
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

        const suggestions =
          validationResult.status === RemoteValidationStatus.Valid && allowResolvedSuggestion
            ? []
            : resolutionCandidates;

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
      } catch (error) {
        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`;

        if (!notifyOnError) {
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
    [adapter.fields, commit, completeCsvRowValidationTarget, context]
  );

  const runBackgroundImportedCellHydration = useCallback(
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

        commit(
          (current) =>
            setCellValue(current, {
              rowId,
              fieldPath,
              rawValue: nextValue.rawValue,
              displayValue: nextValue.displayValue ?? null,
              parsedValue: nextValue.parsedValue,
            }),
          { rowIds: [rowId] }
        );
      } catch (error) {
        const currentCell = findRow(sessionRef.current, rowId)?.cells[fieldPath];
        if (!currentCell || currentCell.rawValue !== expectedRawValue) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : `Failed to prepare imported ${field.label.toLowerCase()}.`;

        commit(
          (current) =>
            setCellRemoteState(current, {
              rowId,
              fieldPath,
              remoteState: {
                status: RemoteValidationStatus.Invalid,
                suggestions: [],
                selectedSuggestion: null,
                message,
              },
            }),
          { rowIds: [rowId] }
        );
      } finally {
        completeCsvRowValidationTarget(rowId);
      }
    },
    [adapter.fields, commit, completeCsvRowValidationTarget, context]
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

      await runDirectRemoteValidation({ rowId, fieldPath, query: normalizedQuery });
    },
    [adapter.fields, commit, context, runDirectRemoteValidation]
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
          void runInlineSuggestionResolution({ rowId, fieldPath, query: rawValue });
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
      (validatorSuggestionRequest.source === 'validator' &&
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
    commit,
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
    },
    [clearPendingCellSync, commit, validatorSuggestions]
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
    void requestValidatorSuggestions({ rowId, fieldPath, query, source: 'selection' });
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
      commit((current) => selectCellState(current, { rowId, fieldPath }), { validate: false });

      const row = findRow(sessionRef.current, rowId);
      const field = findField(adapter.fields, fieldPath);
      const query = row?.cells[fieldPath]?.rawValue ?? '';
      if (field && hasSuggestionSource(field) && query.trim()) {
        void requestValidatorSuggestions({ rowId, fieldPath, query, source: 'selection' });
      }
    },
    [adapter.fields, commit, requestValidatorSuggestions]
  );

  const setValidatorSelection = useCallback(
    ({ rowId, fieldPath }: { rowId?: string | null; fieldPath?: string | null }) => {
      commit((current) => setValidatorSelectionState(current, { rowId, fieldPath }), {
        validate: false,
      });
    },
    [commit]
  );

  const updateCellValue = useCallback(
    ({ rowId, fieldPath, rawValue }: { rowId: string; fieldPath: string; rawValue: string }) => {
      commit((current) => updateCellRawValue(current, { rowId, fieldPath, rawValue }), {
        rowIds: [rowId],
      });
      scheduleDeferredCellSync({ rowId, fieldPath, rawValue });
    },
    [commit, scheduleDeferredCellSync]
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
    [adapter.fields, commit]
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
    [clearPendingCellSync, commit]
  );

  const addRow = useCallback(() => {
    const blankRow = adapter.createBlankRow?.();
    commit((current) => appendEmptyRow(current, blankRow));
  }, [adapter, commit]);

  const clearRow = useCallback(
    (rowId: string) => {
      const blankRow = adapter.createBlankRow?.();
      commit((current) => clearSessionRow(current, { rowId, values: blankRow }), {
        rowIds: [rowId],
      });
    },
    [adapter, commit]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      commit((current) => deleteSessionRow(current, { rowId }));
    },
    [commit]
  );

  const applySuggestion = useCallback(
    (params: Parameters<typeof stageSuggestionToRows>[1]) => {
      clearPendingCellSync(params.targetRowId, params.fieldPath);
      commit((current) => stageSuggestionToRows(current, params), {
        rowIds: params.applyToAllMatching
          ? sessionRef.current.rows.map((row) => row.id)
          : [params.targetRowId],
      });
    },
    [clearPendingCellSync, commit]
  );

  const acceptCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      clearPendingCellSync(params.rowId, params.fieldPath);
      commit((current) => acceptCorrectionDraft(current, params), {
        rowIds: [params.rowId],
      });
    },
    [clearPendingCellSync, commit]
  );

  const rejectCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      clearPendingCellSync(params.rowId, params.fieldPath);
      commit((current) => rejectCorrectionDraft(current, params), {
        rowIds: [params.rowId],
      });
    },
    [clearPendingCellSync, commit]
  );

  const dismissFeatureNotification = useCallback(
    (notificationId: string) => {
      commit((current) => dismissNotification(current, notificationId), { validate: false });
    },
    [commit]
  );

  const handleCsvUpload = useCallback(
    async (file: File) => {
      try {
        setCsvUploadPhase(CsvUploadPhase.Parsing);
        setCsvUploadNotifications([]);
        resetCsvRowValidationProgress();
        clearValidatorSuggestions();
        const parsedCsv = await parseCsvFile(file);
        setCsvUploadPhase(CsvUploadPhase.Hydrating);
        const imported = importCsvRows({ fields: adapter.fields, rows: parsedCsv.data });
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
            runBackgroundImportedCellHydration({
              ...target,
              importCache,
            })
          );
        });

        remoteValidationTargets.forEach((target) => {
          void backgroundQueueLimitRef.current(() =>
            runDirectRemoteValidation({
              ...target,
              notifyOnError: false,
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
      clearValidatorSuggestions,
      context,
      resetCsvRowValidationProgress,
      runBackgroundImportedCellHydration,
      runDirectRemoteValidation,
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

      await Promise.all(
        current.rows.map(async (row) => {
          const values = getRowSubmissionValues(row);
          const payload = adapter.buildPayload({ row, values, context });
          await adapter.submitRow({
            payload,
            row,
            values,
            context,
          });
        })
      );

      return { rowCount: current.rows.length };
    },
    onSuccess: (data) => {
      commit(
        (current) =>
          pushNotification(current, {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Success,
            message: `${data.rowCount} row(s) imported successfully.`,
          }),
        { validate: false }
      );
    },
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
    if (!sessionRef.current.summary.canSubmit) {
      return;
    }

    importMutation.mutate();
  }, [importMutation]);

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
      setCustomValue,
      setFileValue,
      submitRows,
      updateCellValue,
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
      setCustomValue,
      setFileValue,
      submitRows,
      updateCellValue,
    ]
  );

  return {
    session,
    actions,
    isSubmitting: importMutation.isPending,
    csvUploadPhase,
    csvRowValidationProgress,
    csvUploadNotifications,
    validatorSuggestions,
    dismissCsvUploadNotifications,
    downloadCsvTemplate,
    downloadCurrentCsv,
    downloadGuideTemplate,
    handleCsvUpload,
  };
}
