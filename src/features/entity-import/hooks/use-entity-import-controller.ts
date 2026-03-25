'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getEntityImportTemplateGuide } from '@/features/entity-import/templates/registry';

import {
  type AdapterFieldDefinition,
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  type EntityImportActions,
  type EntityImportAdapter,
  type EntityImportRuntimeContext,
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
import { buildTemplateColumns, importCsvRows } from '../core/csv';
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
  fields: Array<AdapterFieldDefinition>,
  fieldPath: string
): AdapterFieldDefinition | undefined {
  return fields.find((field) => field.path === fieldPath);
}

function findRow(session: IImportSessionState, rowId: string): IImportRowState | undefined {
  return session.rows.find((row) => row.id === rowId);
}

function parseCsvFile(file: File): Promise<Array<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        resolve(result.data);
      },
      error(error) {
        reject(error);
      },
    });
  });
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

function hasSuggestionSource(field?: AdapterFieldDefinition): boolean {
  return fieldHasSuggestionResolution(field);
}

function hasRemoteQuery(field?: AdapterFieldDefinition): boolean {
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
  field: AdapterFieldDefinition,
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
  query: string,
  validationResult: RemoteValidationResult | null,
  suggestions: Array<ISuggestion>
): ISuggestion | null {
  return validationResult?.resolvedSuggestion ?? findExactSuggestionMatch(suggestions, query);
}

export function useEntityImportController<TPayload, TResult>({
  adapter,
  context,
  initialRows,
}: {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  initialRows?: Array<TFlatImportValues>;
}) {
  const validate = useCallback(
    (session: IImportSessionState): IImportSessionState =>
      validateSessionRows({
        session,
        fields: adapter.fields,
        schema: adapter.schema,
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

  const [suggestionRequest, setSuggestionRequest] = useState<{
    rowId: string;
    fieldPath: string;
    query: string;
  } | null>(null);
  const suggestionRequestRef = useRef(suggestionRequest);
  const [remoteValidation, setRemoteValidation] = useState<RemoteValidationResult | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    suggestionRequestRef.current = suggestionRequest;
  }, [suggestionRequest]);

  const suggestionsInfinite = useInfiniteQuery({
    queryKey: [
      'entity-import',
      'remote-suggestions',
      adapter.id,
      suggestionRequest?.rowId ?? '',
      suggestionRequest?.fieldPath ?? '',
      suggestionRequest?.query ?? '',
    ],
    enabled: Boolean(suggestionRequest),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const req = suggestionRequestRef.current;
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

  useEffect(() => {
    if (!suggestionRequest) {
      setRemoteValidation(null);
      return;
    }

    const field = findField(adapter.fields, suggestionRequest.fieldPath);
    if (!field?.remote?.evaluate) {
      setRemoteValidation(null);
      return;
    }

    setRemoteValidation(null);
    let cancelled = false;

    void (async () => {
      try {
        const row = findRow(sessionRef.current, suggestionRequest.rowId);
        const evaluateRemote = field.remote?.evaluate;
        if (!row || !evaluateRemote) {
          return;
        }

        const validationResult = await evaluateRemote({
          query: suggestionRequest.query,
          value: suggestionRequest.query,
          row,
          values: getRowSubmissionValues(row),
          context,
        });

        if (
          !cancelled &&
          cellStillMatchesQuery(
            sessionRef.current,
            suggestionRequest.rowId,
            suggestionRequest.fieldPath,
            suggestionRequest.query
          )
        ) {
          setRemoteValidation(validationResult);
        }
      } catch {
        if (!cancelled) {
          setRemoteValidation(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter.fields, context, suggestionRequest]);

  const commit = useCallback(
    (
      updater: (current: IImportSessionState) => IImportSessionState,
      options?: { validate?: boolean }
    ) => {
      setSession((current) => {
        const next = updater(current);
        const resolvedSession = options?.validate === false ? next : validate(next);
        sessionRef.current = resolvedSession;
        return resolvedSession;
      });
    },
    [validate]
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
          normalizedQuery,
          validationResult,
          resolutionCandidates
        );

        if (matchedSuggestion) {
          commit((current) =>
            resolveCellSuggestion(current, {
              rowId,
              fieldPath,
              suggestion: matchedSuggestion,
            })
          );
          return;
        }

        const suggestions =
          validationResult.status === RemoteValidationStatus.Valid ? [] : resolutionCandidates;

        commit((current) =>
          setCellRemoteState(current, {
            rowId,
            fieldPath,
            remoteState: {
              status:
                validationResult.status === RemoteValidationStatus.Valid
                  ? RemoteValidationStatus.Valid
                  : RemoteValidationStatus.Invalid,
              suggestions,
              selectedSuggestion: null,
              message:
                validationResult.status === RemoteValidationStatus.Valid
                  ? null
                  : resolveSuggestionMessage(field, validationResult, suggestions),
            },
          })
        );
      } catch (error) {
        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`;

        if (!notifyOnError) {
          commit((current) =>
            setCellRemoteState(current, {
              rowId,
              fieldPath,
              remoteState: {
                status: RemoteValidationStatus.Invalid,
                suggestions: localSuggestions,
                selectedSuggestion: null,
                message,
              },
            })
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
      }
    },
    [adapter.fields, commit, context]
  );

  useEffect(() => {
    if (!suggestionRequest) {
      return;
    }

    const { rowId, fieldPath, query } = suggestionRequest;
    const field = findField(adapter.fields, fieldPath);

    if (!field || !hasRemoteQuery(field)) {
      return;
    }

    if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, query)) {
      return;
    }

    const localSuggestions = filterLocalSuggestions(field.options, query);
    const hasRemoteLookup = Boolean(hasRemoteQuery(field) || field.remote?.evaluate);

    if (suggestionsInfinite.isPending && !suggestionsInfinite.data) {
      return;
    }

    if (suggestionsInfinite.isError) {
      const error = suggestionsInfinite.error;
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
                message:
                  error instanceof Error
                    ? error.message
                    : `Failed to load suggestions for ${field.label}.`,
                suggestionPaging: {
                  hasNextPage: false,
                  isFetchingNextPage: false,
                },
              },
            }),
            {
              id: `notification-${Date.now()}`,
              tone: NotificationTone.Error,
              message:
                error instanceof Error
                  ? error.message
                  : `Failed to load suggestions for ${field.label}.`,
            }
          ),
        { validate: false }
      );
      return;
    }

    if (!suggestionsInfinite.data) {
      return;
    }

    const remoteSuggestions = suggestionsInfinite.data.pages.flatMap((page) => page.suggestions);
    const validationResult = remoteValidation;
    const resolutionCandidates = mergeSuggestions(
      localSuggestions,
      remoteSuggestions,
      validationResult?.suggestions,
      validationResult?.resolvedSuggestion ? [validationResult.resolvedSuggestion] : undefined
    );
    const matchedSuggestion = resolveMatchedSuggestion(
      query,
      validationResult,
      resolutionCandidates
    );

    if (matchedSuggestion) {
      commit((current) =>
        resolveCellSuggestion(current, {
          rowId,
          fieldPath,
          suggestion: matchedSuggestion,
        })
      );
      return;
    }

    const suggestions =
      validationResult?.status === RemoteValidationStatus.Valid ? [] : resolutionCandidates;

    const previousSelected = findRow(sessionRef.current, rowId)?.cells[fieldPath].remoteState
      .selectedSuggestion;
    const selectedSuggestion =
      previousSelected &&
      suggestions.some((candidate) => candidate.value === previousSelected.value)
        ? previousSelected
        : null;

    commit((current) =>
      setCellRemoteState(current, {
        rowId,
        fieldPath,
        remoteState: {
          status:
            validationResult?.status === RemoteValidationStatus.Valid
              ? RemoteValidationStatus.Valid
              : hasRemoteLookup
                ? RemoteValidationStatus.Invalid
                : RemoteValidationStatus.Idle,
          suggestions,
          selectedSuggestion,
          message:
            validationResult?.status === RemoteValidationStatus.Valid
              ? null
              : resolveSuggestionMessage(field, validationResult, suggestions),
          suggestionPaging: {
            hasNextPage: suggestionsInfinite.hasNextPage ?? false,
            isFetchingNextPage: suggestionsInfinite.isFetchingNextPage,
          },
        },
      })
    );
  }, [
    adapter.fields,
    commit,
    remoteValidation,
    suggestionRequest,
    suggestionsInfinite.data,
    suggestionsInfinite.error,
    suggestionsInfinite.hasNextPage,
    suggestionsInfinite.isError,
    suggestionsInfinite.isFetchingNextPage,
    suggestionsInfinite.isPending,
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
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      if (!row) {
        return;
      }

      const currentCell = row.cells[fieldPath];

      commit((current) =>
        setCellRemoteState(current, {
          rowId,
          fieldPath,
          remoteState: {
            ...currentCell.remoteState,
            status: RemoteValidationStatus.Invalid,
            selectedSuggestion: suggestion,
            message: 'Apply the selected suggestion to continue.',
          },
        })
      );
    },
    [commit]
  );

  const requestSuggestions = useCallback(
    async ({ rowId, fieldPath, query }: { rowId: string; fieldPath: string; query: string }) => {
      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (!row || !field || !hasSuggestionSource(field)) {
        return;
      }

      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setSuggestionRequest(null);
        commit((current) =>
          setCellRemoteState(current, {
            rowId,
            fieldPath,
            remoteState: createIdleRemoteState(),
          })
        );
        return;
      }

      const localSuggestions = filterLocalSuggestions(field.options, normalizedQuery);
      const remoteQuery = hasRemoteQuery(field);
      const hasRemoteLookup = Boolean(remoteQuery || field.remote?.evaluate);

      commit((current) =>
        setCellRemoteState(current, {
          rowId,
          fieldPath,
          remoteState: {
            status: hasRemoteLookup ? RemoteValidationStatus.Pending : RemoteValidationStatus.Idle,
            suggestions: localSuggestions,
            selectedSuggestion: null,
            message: null,
            suggestionPaging: {
              hasNextPage: false,
              isFetchingNextPage: false,
            },
          },
        })
      );

      if (remoteQuery) {
        setSuggestionRequest({ rowId, fieldPath, query: normalizedQuery });
        return;
      }

      if (!field.remote?.evaluate) {
        const matchedSuggestion = resolveMatchedSuggestion(normalizedQuery, null, localSuggestions);
        if (matchedSuggestion) {
          commit((current) =>
            resolveCellSuggestion(current, {
              rowId,
              fieldPath,
              suggestion: matchedSuggestion,
            })
          );
          return;
        }

        commit((current) =>
          setCellRemoteState(current, {
            rowId,
            fieldPath,
            remoteState: {
              status: RemoteValidationStatus.Invalid,
              suggestions: localSuggestions,
              selectedSuggestion: null,
              message: resolveSuggestionMessage(field, null, localSuggestions),
            },
          })
        );
        return;
      }

      await runDirectRemoteValidation({ rowId, fieldPath, query: normalizedQuery });
    },
    [adapter.fields, commit, runDirectRemoteValidation]
  );

  const loadMoreSuggestions = useCallback(() => {
    void suggestionsInfinite.fetchNextPage();
  }, [suggestionsInfinite.fetchNextPage]);

  const syncSuggestionsForSelection = useCallback(
    ({ rowId, fieldPath }: { rowId: string | null; fieldPath: string | null }) => {
      if (!rowId || !fieldPath || fieldPath === ENTITY_IMPORT_ALL_COLUMNS) {
        setSuggestionRequest(null);
        setRemoteValidation(null);
        return;
      }

      const currentSession = sessionRef.current;
      const row = findRow(currentSession, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (
        row &&
        field &&
        hasSuggestionSource(field) &&
        row.cells[fieldPath].rawValue.trim() !== ''
      ) {
        void requestSuggestions({
          rowId,
          fieldPath,
          query: row.cells[fieldPath].rawValue,
        });
        return;
      }

      setSuggestionRequest(null);
      setRemoteValidation(null);
    },
    [adapter.fields, requestSuggestions]
  );

  const selectCell = useCallback(
    ({ rowId, fieldPath }: { rowId: string; fieldPath: string }) => {
      commit((current) => selectCellState(current, { rowId, fieldPath }), { validate: false });
      syncSuggestionsForSelection({ rowId, fieldPath });
    },
    [commit, syncSuggestionsForSelection]
  );

  const setValidatorSelection = useCallback(
    ({ rowId, fieldPath }: { rowId?: string | null; fieldPath?: string | null }) => {
      const currentSelection = sessionRef.current.validatorSelection;
      const nextSelection = {
        rowId: rowId !== undefined ? rowId : currentSelection.rowId,
        fieldPath: fieldPath !== undefined ? fieldPath : currentSelection.fieldPath,
      };

      commit((current) => setValidatorSelectionState(current, { rowId, fieldPath }), {
        validate: false,
      });
      syncSuggestionsForSelection(nextSelection);
    },
    [commit, syncSuggestionsForSelection]
  );

  const updateCellValue = useCallback(
    ({ rowId, fieldPath, rawValue }: { rowId: string; fieldPath: string; rawValue: string }) => {
      const field = findField(adapter.fields, fieldPath);

      commit((current) => updateCellRawValue(current, { rowId, fieldPath, rawValue }));

      if (field && hasSuggestionSource(field)) {
        void requestSuggestions({ rowId, fieldPath, query: rawValue });
      }
    },
    [adapter.fields, commit, requestSuggestions]
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
      commit((current) =>
        setCellValue(current, {
          rowId,
          fieldPath,
          rawValue: nextRawValue,
          displayValue: resolvedDisplayValue,
          parsedValue: toParsedFileValue(files, field),
        })
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
      commit((current) =>
        setCellValue(current, {
          rowId,
          fieldPath,
          rawValue,
          displayValue,
          parsedValue,
        })
      );
    },
    [commit]
  );

  const addRow = useCallback(() => {
    const blankRow = adapter.createBlankRow?.();
    commit((current) => appendEmptyRow(current, blankRow));
  }, [adapter, commit]);

  const clearRow = useCallback(
    (rowId: string) => {
      const blankRow = adapter.createBlankRow?.();
      commit((current) => clearSessionRow(current, { rowId, values: blankRow }));
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
      commit((current) => stageSuggestionToRows(current, params));
    },
    [commit]
  );

  const acceptCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      commit((current) => acceptCorrectionDraft(current, params));
    },
    [commit]
  );

  const rejectCorrection = useCallback(
    (params: { rowId: string; fieldPath: string }) => {
      commit((current) => rejectCorrectionDraft(current, params));
    },
    [commit]
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
        const parsedRows = await parseCsvFile(file);
        const imported = importCsvRows({ fields: adapter.fields, rows: parsedRows });
        const hydratedSession = validate(hydrateSessionRows(sessionRef.current, imported));
        const remoteValidationTargets = hydratedSession.rows.flatMap((row) =>
          adapter.fields.flatMap((field) => {
            const query = row.cells[field.path]?.rawValue.trim();
            if (!field.remote?.evaluate || !query) {
              return [];
            }

            return [{ rowId: row.id, fieldPath: field.path, query }];
          })
        );

        setSuggestionRequest(null);
        setRemoteValidation(null);
        sessionRef.current = hydratedSession;
        setSession(hydratedSession);

        await Promise.all(
          remoteValidationTargets.map(({ rowId, fieldPath, query }) =>
            runDirectRemoteValidation({
              rowId,
              fieldPath,
              query,
              notifyOnError: false,
            })
          )
        );
      } catch (error) {
        commit(
          (current) =>
            pushNotification(current, {
              id: `notification-${Date.now()}`,
              tone: NotificationTone.Error,
              message:
                error instanceof Error ? error.message : 'Failed to parse the uploaded CSV file.',
            }),
          { validate: false }
        );
      }
    },
    [adapter.fields, commit, runDirectRemoteValidation, validate]
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

  const actions = useMemo<EntityImportActions>(
    () => ({
      addRow,
      applySuggestion,
      acceptCorrection,
      rejectCorrection,
      chooseSuggestion,
      clearRow,
      deleteRow,
      dismissNotification: dismissFeatureNotification,
      requestSuggestions,
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
      requestSuggestions,
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
    downloadCsvTemplate,
    downloadGuideTemplate,
    handleCsvUpload,
  };
}
