'use client';

/**
 * table cell renderer for brain region: same draft/debounce behavior as generic remote text
 * cells, plus an optional species badge when the committed value matches a suggestion that
 * carries species metadata (see `species-context`). Styling uses `getControlClassName` from
 * `core/helpers` (`shared/helpers.ts`) so it stays consistent with `InlineCell` without importing `ui/inline-cell`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DependencyState,
  type IImportCellState,
  type IImportRowState,
} from '@/features/entity-import/core/contracts';
import {
  getControlClassName,
  getDisplayValue,
  INLINE_CELL_DRAFT_COMMIT_DELAY_MS,
} from '@/features/entity-import/core/shared/helpers';
import { readSpeciesSuggestionFromSuggestion } from '@/features/entity-import/core/shared/species-context';
import { shouldDisplayCellStatusBadge } from '@/features/entity-import/ui/status';
import { Badge } from '@/ui/molecules/badge';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

import type {
  IAdapterFieldDefinition,
  IEntityImportActions,
} from '@/features/entity-import/core/adapter';

/** Brain region text input + species badge for the virtual import table (`field.tableRenderer`). */
export function BrainRegionInlineCell({
  field,
  cell,
  row,
  actions,
  selected,
}: {
  field: IAdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  actions: IEntityImportActions;
  selected: boolean;
}) {
  const displayValue = getDisplayValue(cell);
  const hasStatusBadge = shouldDisplayCellStatusBadge(cell);
  const draftCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftInputValue, setDraftInputValue] = useState(displayValue);
  const draftInputValueRef = useRef(displayValue);
  const lastFlushedValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastFlushedValueRef.current !== null && displayValue === lastFlushedValueRef.current) {
      lastFlushedValueRef.current = null;
      return;
    }

    lastFlushedValueRef.current = null;
    draftInputValueRef.current = displayValue;
    setDraftInputValue(displayValue);
  }, [displayValue]);

  useEffect(() => {
    return () => {
      if (draftCommitTimeoutRef.current) {
        clearTimeout(draftCommitTimeoutRef.current);
      }
    };
  }, []);

  const flushDraftInputValue = useCallback(() => {
    if (draftCommitTimeoutRef.current) {
      clearTimeout(draftCommitTimeoutRef.current);
      draftCommitTimeoutRef.current = null;
    }

    const nextRawValue = draftInputValueRef.current;
    if (nextRawValue === getDisplayValue(cell)) {
      return;
    }

    lastFlushedValueRef.current = nextRawValue;
    actions.onUpdateCellValue({
      rowId: row.id,
      fieldPath: field.path,
      rawValue: nextRawValue,
    });
  }, [actions, cell, field.path, row.id]);

  const scheduleDraftCommit = useCallback(
    (nextRawValue: string) => {
      draftInputValueRef.current = nextRawValue;
      if (draftCommitTimeoutRef.current) {
        clearTimeout(draftCommitTimeoutRef.current);
      }

      draftCommitTimeoutRef.current = setTimeout(
        flushDraftInputValue,
        INLINE_CELL_DRAFT_COMMIT_DELAY_MS
      );
    },
    [flushDraftInputValue]
  );

  const species =
    cell.remoteState.selectedSuggestion && draftInputValue === displayValue
      ? readSpeciesSuggestionFromSuggestion(cell.remoteState.selectedSuggestion)
      : null;

  return (
    <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] h-full min-w-0">
      <div className="relative h-full w-full">
        {species ? (
          <div className="pointer-events-none absolute left-2 top-3 z-10">
            <Badge rounded variant="outline" className="bg-neutral-50 text-primary-9">
              {species.label}
            </Badge>
          </div>
        ) : null}
        <Input
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          type="text"
          className={cn(
            getControlClassName(cell, selected),
            'pointer-events-auto box-border h-full! min-h-[52px] max-h-full! w-full',
            { 'pt-7 pb-1': species },
            { 'pr-10': hasStatusBadge }
          )}
          disabled={cell.dependencyState === DependencyState.Blocked}
          placeholder={field.placeholder}
          value={draftInputValue}
          onFocus={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
          onChange={(event) => {
            const nextRawValue = event.target.value;
            setDraftInputValue(nextRawValue);
            scheduleDraftCommit(nextRawValue);
          }}
          onBlur={flushDraftInputValue}
        />
      </div>
    </div>
  );
}
