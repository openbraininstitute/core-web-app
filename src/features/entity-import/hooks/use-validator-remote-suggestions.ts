'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  type IAdapterFieldDefinition,
  type IEntityImportAdapter,
  type IEntityImportRuntimeContext,
  type IValidatorDraftValue,
  type IValidatorSuggestionState,
} from '@/features/entity-import/core/adapter';
import {
  createIdleRemoteState,
  type IImportRowState,
  type IImportSessionState,
  type ISuggestion,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import {
  fieldHasSuggestionResolution,
  findExactSuggestionMatch,
  getRowSubmissionValues,
} from '@/features/entity-import/core/helpers';
import { resolveCellSuggestion, setCellRemoteState } from '@/features/entity-import/core/session';

const ValidationSource = {
  Selection: 'selection',
  Validator: 'validator',
} as const;

type TValidationSource = (typeof ValidationSource)[keyof typeof ValidationSource];

function findField(
  fields: Array<IAdapterFieldDefinition>,
  fieldPath: string
): IAdapterFieldDefinition | undefined {
  return fields.find((f) => f.path === fieldPath);
}

function findRow(session: IImportSessionState, rowId: string): IImportRowState | undefined {
  return session.rows.find((r) => r.id === rowId);
}

function hasRemoteQuery(field?: IAdapterFieldDefinition): boolean {
  return Boolean(field?.remote?.query);
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

export function mergeSuggestions(
  ...groups: Array<Array<ISuggestion> | undefined>
): Array<ISuggestion> {
  const deduped = new Map<string, ISuggestion>();
  groups.flat().forEach((s) => {
    if (!s) return;
    const existing = deduped.get(s.value);
    deduped.set(s.value, {
      ...existing,
      ...s,
      recommended: existing?.recommended || s.recommended,
      description: existing?.description ?? s.description,
    });
  });
  return [...deduped.values()];
}

export function createValidatorPreviewValueFromSuggestion(
  suggestion: ISuggestion
): IValidatorDraftValue {
  return {
    rawValue: suggestion.label,
    displayValue: suggestion.label,
    parsedValue:
      (suggestion.metadata as { parsedValue?: unknown } | undefined)?.parsedValue ??
      suggestion.value,
  };
}

export function doesValidatorDraftMatchCell(
  cell: IImportRowState['cells'][string],
  draftValue: IValidatorDraftValue
): boolean {
  return (
    cell.rawValue === draftValue.rawValue &&
    (cell.displayValue ?? null) === (draftValue.displayValue ?? null) &&
    Object.is(cell.parsedValue, draftValue.parsedValue)
  );
}

function createIdleValidatorSuggestionState(): IValidatorSuggestionState {
  return {
    rowId: null,
    fieldPath: null,
    query: '',
    ...createIdleRemoteState(),
  };
}

interface ValidatorSuggestionRequest {
  rowId: string;
  fieldPath: string;
  query: string;
  source: TValidationSource;
}

/**
 * encapsulates the validator panel's remote suggestion lifecycle
 *
 * 1. tracks the current suggestion request (row + field + query + source)
 * 2. drives a `useInfiniteQuery` for paginated remote lookups
 * 3. syncs query results into a derived `IValidatorSuggestionState`
 * 4. handles auto-resolution (exact match / single result) with correct
 *    commit-vs-stage semantics depending on the request source.
 *
 * returns stable callbacks and state that the parent controller wires into
 * its commit pipeline and action interface
 */
export function useValidatorRemoteSuggestions<TPayload, TResult>({
  adapter,
  context,
  sessionRef,
  commit,
  updateValidatorPreview,
  clearValidatorPreviewForCell,
}: {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
  sessionRef: React.RefObject<IImportSessionState>;
  commit: (
    updater: (current: IImportSessionState) => IImportSessionState,
    options?: { validate?: boolean; rowIds?: Array<string> }
  ) => void;
  updateValidatorPreview: (params: {
    rowId: string;
    fieldPath: string;
    value: IValidatorDraftValue | null;
  }) => void;
  clearValidatorPreviewForCell: (rowId: string, fieldPath: string) => void;
}) {
  const [request, setRequest] = useState<ValidatorSuggestionRequest | null>(null);
  const requestRef = useRef(request);

  const [suggestions, setSuggestions] = useState<IValidatorSuggestionState>(
    createIdleValidatorSuggestionState
  );
  const suggestionsRef = useRef(suggestions);

  // keep refs in sync
  useEffect(() => {
    requestRef.current = request;
  }, [request]);
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  const infiniteQuery = useInfiniteQuery({
    queryKey: [
      'entity-import/validator-remote-suggestions',
      adapter.id,
      request?.rowId ?? '',
      request?.fieldPath ?? '',
      request?.query ?? '',
    ],
    enabled:
      Boolean(request) &&
      Boolean(findField(adapter.fields, request?.fieldPath ?? '')?.remote?.query),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const req = requestRef.current;
      if (!req) {
        return {
          suggestions: [] as Array<ISuggestion>,
          nextPageParam: null as number | null,
        };
      }

      const row = findRow(sessionRef.current, req.rowId);
      const field = findField(adapter.fields, req.fieldPath);
      if (!row || !field?.remote?.query) {
        return { suggestions: [], nextPageParam: null };
      }

      return field.remote.query({
        query: req.query,
        row,
        values: getRowSubmissionValues(row),
        context,
        pageParam,
        pageSize: ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
      });
    },
    getNextPageParam: (lastPage: { nextPageParam: number | null }) => lastPage.nextPageParam,
    retry: 1,
  });

  // this effect is the single place where remote query data flows into the
  // validator suggestion state.
  useEffect(() => {
    if (!request) return;

    const field = findField(adapter.fields, request.fieldPath);
    if (!field || !hasRemoteQuery(field)) return;

    const row = findRow(sessionRef.current, request.rowId);
    if (!row) return;

    const currentCell = row.cells[request.fieldPath];
    const localSuggestions = filterLocalSuggestions(field.options, request.query);

    if (infiniteQuery.isError) {
      const error = infiniteQuery.error;
      setSuggestions({
        rowId: request.rowId,
        fieldPath: request.fieldPath,
        query: request.query,
        status: RemoteValidationStatus.Invalid,
        suggestions: localSuggestions,
        selectedSuggestion: currentCell.remoteState.selectedSuggestion,
        message:
          error instanceof Error ? error.message : `Failed to load suggestions for ${field.label}.`,
        suggestionPaging: { hasNextPage: false, isFetchingNextPage: false },
      });
      return;
    }

    if (!infiniteQuery.data) return;

    const remoteSuggestions = infiniteQuery.data.pages.flatMap(
      (page: { suggestions: Array<ISuggestion> }) => page.suggestions
    );
    const merged = mergeSuggestions(localSuggestions, remoteSuggestions);
    const normalizedQuery = request.query.trim();
    const paging = {
      hasNextPage: infiniteQuery.hasNextPage ?? false,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    };

    const exactMatch = findExactSuggestionMatch(merged, normalizedQuery);
    const autoResolved =
      exactMatch ??
      (request.source === ValidationSource.Validator &&
      field.remote?.evaluate &&
      merged.length === 1 &&
      !paging.hasNextPage
        ? merged[0]
        : null);

    const cellAlreadyResolved =
      currentCell.remoteState.status === RemoteValidationStatus.Valid &&
      currentCell.remoteState.selectedSuggestion?.value === autoResolved?.value &&
      currentCell.rawValue.trim() === autoResolved?.label.trim();

    if (autoResolved && !cellAlreadyResolved) {
      if (request.source === ValidationSource.Validator) {
        const previewValue = createValidatorPreviewValueFromSuggestion(autoResolved);
        commit(
          (current) =>
            setCellRemoteState(current, {
              rowId: request.rowId,
              fieldPath: request.fieldPath,
              remoteState: {
                ...currentCell.remoteState,
                suggestions: merged,
                status: RemoteValidationStatus.Invalid,
                selectedSuggestion: autoResolved,
                message: 'Apply the selected suggestion to continue.',
              },
            }),
          { rowIds: [request.rowId] }
        );
        updateValidatorPreview({
          rowId: request.rowId,
          fieldPath: request.fieldPath,
          value: doesValidatorDraftMatchCell(currentCell, previewValue) ? null : previewValue,
        });
        setSuggestions({
          rowId: request.rowId,
          fieldPath: request.fieldPath,
          query: request.query,
          status: RemoteValidationStatus.Invalid,
          suggestions: merged,
          selectedSuggestion: autoResolved,
          message: 'Review the selected option, then apply it to continue.',
          suggestionPaging: paging,
        });
        return;
      }

      // selection-sourced: auto-commit to cell.
      clearValidatorPreviewForCell(request.rowId, request.fieldPath);
      commit(
        (current) =>
          resolveCellSuggestion(current, {
            rowId: request.rowId,
            fieldPath: request.fieldPath,
            suggestion: autoResolved,
          }),
        { rowIds: [request.rowId] }
      );
      setSuggestions({
        rowId: request.rowId,
        fieldPath: request.fieldPath,
        query: request.query,
        status: RemoteValidationStatus.Valid,
        suggestions: merged,
        selectedSuggestion: autoResolved,
        message: null,
        suggestionPaging: paging,
      });
      return;
    }

    // no auto-resolution: show suggestion list
    const selectedSuggestion =
      currentCell.remoteState.selectedSuggestion &&
      merged.some((c) => c.value === currentCell.remoteState.selectedSuggestion?.value)
        ? currentCell.remoteState.selectedSuggestion
        : null;
    const queryMatchesCell = currentCell.rawValue.trim() === normalizedQuery;
    const hasResolvedValue =
      queryMatchesCell &&
      currentCell.remoteState.status === RemoteValidationStatus.Valid &&
      selectedSuggestion !== null;
    const unresolvedMessage =
      (queryMatchesCell ? currentCell.remoteState.message : null) ??
      resolveSuggestionMessage(field, merged);

    setSuggestions({
      rowId: request.rowId,
      fieldPath: request.fieldPath,
      query: request.query,
      status: hasResolvedValue ? RemoteValidationStatus.Valid : RemoteValidationStatus.Invalid,
      suggestions: merged,
      selectedSuggestion,
      message: hasResolvedValue ? null : unresolvedMessage,
      suggestionPaging: paging,
    });
  }, [
    adapter.fields,
    clearValidatorPreviewForCell,
    commit,
    updateValidatorPreview,
    request,
    infiniteQuery.data,
    infiniteQuery.error,
    infiniteQuery.hasNextPage,
    infiniteQuery.isError,
    infiniteQuery.isFetchingNextPage,
    sessionRef,
  ]);

  const clearSuggestions = useCallback(() => {
    requestRef.current = null;
    setRequest(null);
    setSuggestions(createIdleValidatorSuggestionState());
  }, []);

  /**
   * initiate a suggestion lookup for the given cell.
   *
   * - For local-only fields (no remote.query), resolves synchronously from
   *   field.options + cell.remoteState.
   * - For remote fields, sets the request which triggers the infinite query.
   */
  const requestSuggestions = useCallback(
    ({
      rowId,
      fieldPath,
      query,
      source = 'selection' as TValidationSource,
    }: {
      rowId: string;
      fieldPath: string;
      query: string;
      source?: TValidationSource;
    }) => {
      const session = sessionRef.current;
      const row = findRow(session, rowId);
      const field = findField(adapter.fields, fieldPath);

      if (!row || !field || !fieldHasSuggestionResolution(field)) {
        clearSuggestions();
        return;
      }

      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        clearSuggestions();
        return;
      }

      const cell = row.cells[fieldPath];
      const localSuggestions = filterLocalSuggestions(field.options, normalizedQuery);

      if (!hasRemoteQuery(field)) {
        // local-only: resolve immediately without triggering the infinite query
        requestRef.current = null;
        setRequest(null);
        setSuggestions({
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

      // remote: set request to trigger infinite query
      const nextRequest: ValidatorSuggestionRequest = {
        rowId,
        fieldPath,
        query: normalizedQuery,
        source,
      };
      requestRef.current = nextRequest;
      setRequest(nextRequest);
      setSuggestions({
        rowId,
        fieldPath,
        query: normalizedQuery,
        status: RemoteValidationStatus.Pending,
        suggestions: localSuggestions,
        selectedSuggestion: cell.remoteState.selectedSuggestion,
        message: cell.remoteState.message,
        suggestionPaging: { hasNextPage: false, isFetchingNextPage: false },
      });
    },
    [adapter.fields, clearSuggestions, sessionRef]
  );

  const loadMoreSuggestions = useCallback(() => {
    if (!request) return;
    void infiniteQuery.fetchNextPage();
  }, [request, infiniteQuery]);

  /**
   * user picked a suggestion from the validator panel list.
   * Stages it as selectedSuggestion + preview without committing to the cell
   */
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
      const session = sessionRef.current;
      const row = findRow(session, rowId);
      if (!row) return;

      const currentCell = row.cells[fieldPath];
      // use ref to avoid stale closure on rapid clicks.
      const currentSuggestions = suggestionsRef.current;
      const persistedSuggestions =
        currentSuggestions.rowId === rowId && currentSuggestions.fieldPath === fieldPath
          ? currentSuggestions.suggestions
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
      setSuggestions((current) =>
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
    [commit, sessionRef, updateValidatorPreview]
  );

  return {
    suggestions,
    request,
    requestSuggestions,
    clearSuggestions,
    loadMoreSuggestions,
    chooseSuggestion,
  };
}

function resolveSuggestionMessage(
  field: IAdapterFieldDefinition,
  suggestions: Array<ISuggestion>
): string | null {
  if (suggestions.length > 0) {
    return 'Choose the closest suggestion and apply it.';
  }
  return `No matches found for ${field.label}.`;
}
