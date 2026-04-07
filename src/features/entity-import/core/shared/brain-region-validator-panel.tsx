'use client';

import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiInfoI } from '@remixicon/react';

import {
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  type IAdapterFieldDefinition,
  type IEntityImportActions,
  type IEntityImportRuntimeContext,
  type IValidatorDraftValue,
} from '@/features/entity-import/core/adapter';
import {
  type IImportCellState,
  type IImportRowState,
  type ISuggestion,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import { getRowSubmissionValues } from '@/features/entity-import/core/shared/helpers';
import { SpeciesScopedFieldPanel } from '@/features/entity-import/core/shared/species-scoped-field-panel';
import {
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/core/shared/ui';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

const BRAIN_REGION_VALIDATOR_SUGGESTION_SKELETON_KEYS = Array.from(
  { length: ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE },
  (_, index) => `brain-region-validator-suggestion-skeleton-${index}`
);

function doesDraftMatchSuggestion(
  draftValue: IValidatorDraftValue,
  suggestion: ISuggestion | null
): suggestion is ISuggestion {
  if (!suggestion) {
    return false;
  }

  return (
    draftValue.rawValue === suggestion.label &&
    (draftValue.displayValue ?? suggestion.label) === suggestion.label &&
    Object.is(
      draftValue.parsedValue,
      (suggestion.metadata as { parsedValue?: unknown } | undefined)?.parsedValue ??
        suggestion.value
    )
  );
}

function readSuggestionText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function BrainRegionSuggestionSkeletonList() {
  return (
    <div className="px-4 flex flex-col gap-1.5">
      {BRAIN_REGION_VALIDATOR_SUGGESTION_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className={cn(
            'flex min-w-0 items-center gap-2 overflow-hidden rounded-xl',
            'border border-neutral-200 bg-white px-3 py-3'
          )}
          data-testid="validator-suggestion-skeleton"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3 rounded-full" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
          </div>
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function BrainRegionValidatorPanel({
  field,
  row,
  cell,
  actions,
  context,
  draftValue,
  onDraftChange,
  remoteState,
  querySpecies,
  relatedFieldPath,
}: {
  field: IAdapterFieldDefinition;
  row: IImportRowState;
  cell: IImportCellState;
  actions: IEntityImportActions;
  context: IEntityImportRuntimeContext;
  draftValue: IValidatorDraftValue;
  onDraftChange: (value: IValidatorDraftValue) => void;
  remoteState: IImportCellState['remoteState'];
  querySpecies: (args: { context: IEntityImportRuntimeContext }) => Promise<Array<ISuggestion>>;
  relatedFieldPath?: string;
}) {
  const rowValues = getRowSubmissionValues(row);
  const shouldShowSuggestionSkeleton =
    remoteState.status === RemoteValidationStatus.Pending && remoteState.suggestions.length === 0;
  const shouldShowSuggestions = remoteState.suggestions.length > 0;

  return (
    <div className="space-y-4">
      <SpeciesScopedFieldPanel
        field={field}
        row={row}
        cell={cell}
        actions={actions}
        context={context}
        draftValue={draftValue}
        onDraftChange={onDraftChange}
        querySpecies={querySpecies}
        relatedFieldPath={relatedFieldPath}
      />

      {shouldShowSuggestionSkeleton ? <BrainRegionSuggestionSkeletonList /> : null}

      {shouldShowSuggestions ? (
        <div className="px-4 flex flex-col gap-1.5">
          {remoteState.suggestions.map((suggestion) => {
            const isSelected =
              doesDraftMatchSuggestion(draftValue, remoteState.selectedSuggestion) &&
              remoteState.selectedSuggestion.value === suggestion.value;
            const speciesLabel = readSuggestionText(
              (suggestion.metadata as { species?: string } | undefined)?.species
            );
            const suggestionDetails = field.validatorSuggestionDetails?.({
              suggestion,
              cell,
              row,
              values: rowValues,
            });

            return (
              <button
                type="button"
                key={suggestion.value}
                data-import-input-type-item={`${field.inputType}-suggestion`}
                aria-label={`Select suggestion ${suggestion.label}`}
                className={cn(
                  'flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border',
                  'px-3 py-3 transition-all ease-out-expo select-none',
                  isSelected
                    ? 'border-green-main bg-green-main/10 text-green-main border-2'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
                onClick={() => {
                  actions.chooseSuggestion({
                    rowId: row.id,
                    fieldPath: field.path,
                    suggestion,
                  });
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      {speciesLabel ? (
                        <Badge
                          rounded
                          variant="outline"
                          className="bg-neutral-50 text-primary-9 text-[11px]"
                        >
                          {speciesLabel}
                        </Badge>
                      ) : null}
                      <span
                        className={cn('block font-medium wrap-break-word whitespace-normal', {
                          'font-bold!': isSelected,
                        })}
                      >
                        {suggestion.label}
                      </span>
                    </div>
                  </div>
                </div>
                {suggestionDetails ? (
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      aria-label={`Show details for suggestion ${suggestion.label} (${suggestion.value})`}
                    >
                      {/** biome-ignore lint/a11y/noStaticElementInteractions: parent already a button */}
                      <div
                        className={cn(
                          ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
                          'size-5.5! shrink-0 self-center bg-white group'
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <RiInfoI className="size-3.5! text-primary-8! group-hover:text-primary-6!" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="end"
                      sideOffset={0}
                      alignOffset={0}
                      arrowClassName="bg-white"
                      className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
                    >
                      {suggestionDetails}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <div
                  className={cn(
                    'flex size-5! shrink-0 items-center justify-center rounded-full border border-neutral-200 p-2',
                    isSelected
                      ? 'border-green-main bg-green-main text-white'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  {isSelected ? <CheckOutlined className="opacity-100 size-2.5!" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {remoteState.suggestionPaging &&
      (remoteState.suggestionPaging.hasNextPage ||
        remoteState.suggestionPaging.isFetchingNextPage) ? (
        <div className="px-4">
          <Button
            rounded
            type="button"
            variant="outline"
            size="md"
            className="w-full text-sm text-primary-9 active:text-white select-none"
            disabled={remoteState.suggestionPaging.isFetchingNextPage}
            onClick={() => actions.loadMoreSuggestions()}
          >
            {remoteState.suggestionPaging.isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <LoadingOutlined spin />
                <span className="text-sm text-primary-9">Loading...</span>
              </div>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
