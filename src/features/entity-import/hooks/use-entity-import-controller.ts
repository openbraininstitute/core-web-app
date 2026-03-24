'use client';

import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createIdleRemoteState,
  type FlatImportValues,
  type ImportRowState,
  type ImportSessionState,
  type ISuggestion,
  NotificationTone,
  RemoteValidationStatus,
} from '../core/contracts';
import { buildTemplateColumns, importCsvRows } from '../core/csv';
import { createRemoteSuggestionCacheKey } from '../core/remote-validation';
import {
  acceptCorrectionDraft,
  appendEmptyRow,
  createImportSessionState,
  dismissNotification,
  hydrateSessionRows,
  pushNotification,
  rejectCorrectionDraft,
  selectCell as selectCellState,
  setCellRemoteState,
  setCellValue,
  stageSuggestionToRows,
  updateCellRawValue,
} from '../core/session';
import { validateSessionRows } from '../core/validation';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
  RemoteValidationResult,
} from '../core/adapter';

function valuesFromRow(row: ImportRowState): FlatImportValues {
  return Object.fromEntries(Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue]));
}

function findField(
  fields: Array<AdapterFieldDefinition>,
  fieldPath: string
): AdapterFieldDefinition | undefined {
  return fields.find((field) => field.path === fieldPath);
}

function findRow(session: ImportSessionState, rowId: string): ImportRowState | undefined {
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

function hasSuggestionSource(field?: AdapterFieldDefinition): boolean {
  return Boolean(
    field && (field.remote?.search || field.remote?.validate || field.options?.length)
  );
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
  session: ImportSessionState,
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

export function useEntityImportController<TPayload, TResult>({
  adapter,
  context,
  initialRows,
}: {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  initialRows?: Array<FlatImportValues>;
}) {
  const remoteSuggestionCache = useRef(new Map<string, Array<ISuggestion>>());

  const validate = useCallback(
    (session: ImportSessionState): ImportSessionState =>
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

  const [session, setSession] = useState<ImportSessionState>(() => {
    const blankRow = adapter.createBlankRow?.() ?? undefined;
    const baseSession = createImportSessionState({
      fields: adapter.fields,
      rows: initialRows?.length ? initialRows : blankRow ? [blankRow] : undefined,
      rowCount: initialRows?.length ? undefined : 1,
    });

    return validate(baseSession);
  });
  const sessionRef = useRef(session);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const commit = useCallback(
    (
      updater: (current: ImportSessionState) => ImportSessionState,
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
      const hasRemoteLookup = Boolean(field.remote?.search || field.remote?.validate);

      commit((current) =>
        setCellRemoteState(current, {
          rowId,
          fieldPath,
          remoteState: {
            status: hasRemoteLookup ? RemoteValidationStatus.Pending : RemoteValidationStatus.Idle,
            suggestions: localSuggestions,
            selectedSuggestion: null,
            message: null,
          },
        })
      );

      try {
        const rowValues = valuesFromRow(row);
        let remoteSuggestions: Array<ISuggestion> = [];

        if (field.remote?.search) {
          const cacheKey = createRemoteSuggestionCacheKey(fieldPath, normalizedQuery);
          remoteSuggestions = remoteSuggestionCache.current.get(cacheKey) ?? [];

          if (remoteSuggestions.length === 0) {
            remoteSuggestions = await field.remote.search({
              query: normalizedQuery,
              row,
              values: rowValues,
              context,
            });
            remoteSuggestionCache.current.set(cacheKey, remoteSuggestions);
          }
        }

        const validationResult = field.remote?.validate
          ? await field.remote.validate({
              query: normalizedQuery,
              value: normalizedQuery,
              row,
              values: rowValues,
              context,
            })
          : null;

        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
          return;
        }

        const suggestions =
          validationResult?.status === RemoteValidationStatus.Valid
            ? []
            : mergeSuggestions(localSuggestions, remoteSuggestions, validationResult?.suggestions);

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
              selectedSuggestion: null,
              message:
                validationResult?.status === RemoteValidationStatus.Valid
                  ? null
                  : resolveSuggestionMessage(field, validationResult, suggestions),
            },
          })
        );
      } catch (error) {
        if (!cellStillMatchesQuery(sessionRef.current, rowId, fieldPath, normalizedQuery)) {
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
                  message:
                    error instanceof Error
                      ? error.message
                      : `Failed to load suggestions for ${field.label}.`,
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
      }
    },
    [adapter.fields, commit, context]
  );

  const selectCell = useCallback(
    ({ rowId, fieldPath }: { rowId: string; fieldPath: string }) => {
      commit((current) => selectCellState(current, { rowId, fieldPath }), { validate: false });

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
      }
    },
    [adapter.fields, commit, requestSuggestions]
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
      file,
      displayValue,
    }: {
      rowId: string;
      fieldPath: string;
      file: File | null;
      displayValue?: string | null;
    }) => {
      commit((current) =>
        setCellValue(current, {
          rowId,
          fieldPath,
          rawValue: file?.name ?? '',
          displayValue: displayValue ?? file?.name ?? null,
          parsedValue: file,
        })
      );
    },
    [commit]
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
        commit((current) => hydrateSessionRows(current, imported));
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
    [adapter.fields, commit]
  );

  const downloadTemplate = useCallback(() => {
    const csv = Papa.unparse({
      fields: buildTemplateColumns(adapter.fields),
      data: [],
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = adapter.templateFileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [adapter.fields, adapter.templateFileName]);

  const submitRows = useCallback(async () => {
    if (!sessionRef.current.summary.canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        sessionRef.current.rows.map(async (row) => {
          const values = valuesFromRow(row);
          const payload = adapter.buildPayload({ row, values, context });
          await adapter.submitRow({
            payload,
            row,
            values,
            context,
          });
        })
      );

      commit(
        (current) =>
          pushNotification(current, {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Success,
            message: `${current.rows.length} row(s) imported successfully.`,
          }),
        { validate: false }
      );
    } catch (error) {
      commit(
        (current) =>
          pushNotification(current, {
            id: `notification-${Date.now()}`,
            tone: NotificationTone.Error,
            message: error instanceof Error ? error.message : 'One or more rows failed to import.',
          }),
        { validate: false }
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [adapter, commit, context]);

  const actions = useMemo<EntityImportActions>(
    () => ({
      addRow,
      applySuggestion,
      acceptCorrection,
      rejectCorrection,
      chooseSuggestion,
      dismissNotification: dismissFeatureNotification,
      requestSuggestions,
      selectCell,
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
      dismissFeatureNotification,
      requestSuggestions,
      selectCell,
      setCustomValue,
      setFileValue,
      submitRows,
      updateCellValue,
    ]
  );

  return {
    session,
    actions,
    isSubmitting,
    downloadTemplate,
    handleCsvUpload,
  };
}
