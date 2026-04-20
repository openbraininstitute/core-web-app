'use client';

import { RiAddCircleLine, RiDeleteBin7Line, RiDropdownList } from '@remixicon/react';
import { upperFirst } from 'es-toolkit/compat';
import { useCallback, useMemo, useState } from 'react';

import {
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/core/shared/ui';
import { getTableCellUiStatus, TableCellUiStatus } from '@/features/entity-import/ui/status';
import { AsyncSelect } from '@/ui/molecules/async-select';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  IEntityImportActions,
  IEntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
import type {
  IImportCellState,
  IImportRowState,
  ISuggestion,
} from '@/features/entity-import/core/contracts';
import type { IEntityImportContributionLookupServices } from '@/features/entity-import/core/shared/common-query-services';
import type { IParsedContributionCsvEntry } from '@/features/entity-import/core/shared/contribution-csv-parser';

export type TContributionDraft = IParsedContributionCsvEntry;

type TContributionSelectFilters = Partial<PaginationFilter & SearchFilter> & {
  pref_label__ilike?: string | null;
  query?: string | null;
};

const CONTRIBUTOR_TYPES: Array<ISuggestion> = Object.values(AgentType).map((typeOption) => ({
  value: typeOption.key,
  label: typeOption.label,
}));

const CONTRIBUTION_TRIGGER_CLASSNAME =
  'h-10 rounded-md border-neutral-200 px-4 pr-3 shadow-none hover:border-neutral-300 hover:bg-white';
const CONTRIBUTION_LABEL_CLASSNAME = 'text-base font-normal text-primary-9';
const CONTRIBUTION_CONTENT_CLASSNAME = cn(ENTITY_IMPORT_POPOVER_Z_CLASS, 'rounded-md');

function createContributionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `contribution-${Math.random().toString(36).slice(2)}`;
}

function createBlankContribution(): TContributionDraft {
  return {
    id: createContributionId(),
    source_tuple: '',
    agent_type: undefined,
    agent_id: '',
    role_id: '',
    agent_label: '',
    role_label: '',
    issues: [],
  };
}

function isRenderableContribution(entry: TContributionDraft): boolean {
  return Boolean(
    entry.agent_type ||
      entry.agent_id ||
      entry.role_id ||
      entry.agent_label ||
      entry.role_label ||
      entry.imported_agent_text ||
      entry.imported_role_text ||
      entry.imported_type_text
  );
}

export function summarizeContributions(entries: Array<TContributionDraft>): string {
  const completedEntries = entries.filter(
    (entry) => entry.agent_type && entry.agent_id && entry.role_id
  );

  if (completedEntries.length === 0) {
    return '';
  }

  return `${completedEntries.length} contributor${completedEntries.length === 1 ? '' : 's'}`;
}

export function countRenderableEntries(
  entries: Array<TContributionDraft>
): Array<TContributionDraft> {
  return entries.filter(isRenderableContribution);
}

export function getRenderableContributionEntries(entries: unknown): Array<TContributionDraft> {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry): entry is TContributionDraft => Boolean(entry))
    .filter(isRenderableContribution);
}

export function getContributionIssues(entries: unknown): Array<string> {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || !('issues' in entry)) {
      return [];
    }

    return Array.isArray(entry.issues)
      ? entry.issues.filter((issue: unknown): issue is string => typeof issue === 'string')
      : [];
  });
}

function clearContributionImportState(entry: TContributionDraft): TContributionDraft {
  return {
    ...entry,
    imported_agent_text: undefined,
    imported_role_text: undefined,
    imported_type_text: undefined,
    issues: [],
  };
}

export function promoteContributionToPrimary(
  entries: Array<TContributionDraft>,
  contributionId: string
): Array<TContributionDraft> {
  const targetIndex = entries.findIndex((entry) => entry.id === contributionId);
  if (targetIndex <= 0) {
    return entries;
  }

  const nextEntries = [...entries];
  const [selectedEntry] = nextEntries.splice(targetIndex, 1);
  if (!selectedEntry) {
    return entries;
  }

  nextEntries.unshift(selectedEntry);
  return nextEntries;
}

function createSuggestionResponse<T>(
  data: Array<T>,
  page: number,
  pageSize: number,
  hasNextPage: boolean
): EntityCoreResponse<T> {
  return {
    data,
    pagination: {
      page,
      page_size: pageSize,
      total_items: hasNextPage ? page * pageSize + 1 : (page - 1) * pageSize + data.length,
    },
  };
}

function readPagedFilters(filters: TContributionSelectFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.page_size ?? 10, 1);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

function readFilterQuery(filters: TContributionSelectFilters, key: 'pref_label__ilike' | 'query') {
  const value = filters[key];
  return typeof value === 'string' ? value : '';
}

async function queryContributionTypes({
  filters,
}: {
  filters: TContributionSelectFilters;
}): Promise<EntityCoreResponse<ISuggestion>> {
  const { page, pageSize, offset } = readPagedFilters(filters);
  const pageEntries = CONTRIBUTOR_TYPES.slice(offset, offset + pageSize);

  return createSuggestionResponse(
    pageEntries,
    page,
    pageSize,
    offset + pageEntries.length < CONTRIBUTOR_TYPES.length
  );
}

async function querySuggestionPage<TQueryField extends 'pref_label__ilike' | 'query'>({
  filters,
  searchField,
  context,
  querySuggestions,
}: {
  filters: TContributionSelectFilters;
  searchField: TQueryField;
  context: IEntityImportRuntimeContext;
  querySuggestions?:
    | ((args: {
        query: string;
        queryField: TQueryField;
        context: IEntityImportRuntimeContext;
        pageParam?: number;
        pageSize?: number;
      }) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>)
    | undefined;
}): Promise<EntityCoreResponse<ISuggestion>> {
  const { page, pageSize, offset } = readPagedFilters(filters);

  if (!querySuggestions) {
    return createSuggestionResponse([], page, pageSize, false);
  }

  const result = await querySuggestions({
    query: readFilterQuery(filters, searchField),
    queryField: searchField,
    context,
    pageParam: offset,
    pageSize,
  });
  return createSuggestionResponse(
    result.suggestions,
    page,
    pageSize,
    result.nextPageParam !== null
  );
}

function resolveContributorSearchPage(
  agentType: TAgentType | undefined,
  services: IEntityImportContributionLookupServices
) {
  if (agentType === AgentType.Organization.key) {
    return services.queryOrganization;
  }

  if (agentType === AgentType.Consortium.key) {
    return services.queryConsortium;
  }

  if (agentType === AgentType.Person.key) {
    return services.queryPerson;
  }

  return undefined;
}

function resolveContributionPreview(entry: TContributionDraft): {
  label: string;
  roleLabel: string | null;
} {
  return {
    label:
      entry.agent_label?.trim() ||
      entry.imported_agent_text?.trim() ||
      entry.agent_id?.trim() ||
      entry.role_label?.trim() ||
      entry.imported_role_text?.trim() ||
      entry.role_id?.trim() ||
      'Unnamed contributor',
    roleLabel:
      entry.role_label?.trim() || entry.imported_role_text?.trim() || entry.role_id?.trim() || null,
  };
}

function ContributionPreviewText({
  entry,
  emptyLabel,
}: {
  entry: TContributionDraft | null;
  emptyLabel: string;
}) {
  if (!entry) {
    return (
      <span className="flex items-center gap-1 font-bold text-primary-9 hover:text-primary-7">
        {emptyLabel}
        <RiDropdownList />
      </span>
    );
  }

  const preview = resolveContributionPreview(entry);
  const role = upperFirst(preview.roleLabel?.toLowerCase());
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-sm font-medium text-neutral-900" title={preview.label}>
        {preview.label}
      </span>
      {role ? (
        <span className="block truncate text-xs text-neutral-500" title={role}>
          {role}
        </span>
      ) : null}
    </span>
  );
}

export function ContributionSummaryCell({
  label,
  triggerLabel,
  cell,
  entries,
  onClick,
  onPromoteContribution,
}: {
  label: string;
  triggerLabel: string;
  cell: IImportCellState;
  entries: unknown;
  onClick: () => void;
  onPromoteContribution: (contributionId: string) => void;
}) {
  const contributions = getRenderableContributionEntries(entries);
  const primary = contributions[0] ?? null;
  const overflowCount = Math.max(contributions.length - 1, 0);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const cellUiStatus = getTableCellUiStatus(cell);

  return (
    <div
      className={cn(
        'flex h-full min-h-[52px] w-full items-stretch gap-2',
        {
          'bg-amber-50/70 text-amber-950': cellUiStatus === TableCellUiStatus.Warning,
        },
        {
          'bg-sky-50/70 text-sky-950': cellUiStatus === TableCellUiStatus.NeedsSelection,
        },
        {
          'bg-neutral-50 text-neutral-700': cellUiStatus === TableCellUiStatus.Validating,
        }
      )}
    >
      <Button
        type="button"
        aria-label={triggerLabel}
        variant="ghost"
        size="md"
        className={cn(
          'h-full min-h-[52px] w-full min-w-0 flex-1 justify-start rounded-none border-0',
          'px-3 py-2 text-left shadow-none',
          {
            'bg-transparent hover:bg-neutral-50':
              cellUiStatus !== TableCellUiStatus.Warning &&
              cellUiStatus !== TableCellUiStatus.NeedsSelection &&
              cellUiStatus !== TableCellUiStatus.Validating,
          },
          {
            'bg-amber-50/70 text-amber-950 hover:bg-amber-100/70':
              cellUiStatus === TableCellUiStatus.Warning,
          },
          {
            'bg-sky-50/70 text-sky-950 hover:bg-sky-100/70':
              cellUiStatus === TableCellUiStatus.NeedsSelection,
          },
          {
            'bg-neutral-50 text-neutral-700 hover:bg-neutral-100':
              cellUiStatus === TableCellUiStatus.Validating,
          }
        )}
        onClick={onClick}
      >
        <ContributionPreviewText entry={primary} emptyLabel={`Add ${label.toLowerCase()}`} />
      </Button>

      {overflowCount > 0 ? (
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center pr-3">
              <button
                type="button"
                aria-label={`Show ${overflowCount} more contribution${overflowCount === 1 ? '' : 's'}`}
                className={cn(
                  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
                  'size-8!',
                  {
                    'border-amber-200 bg-amber-100/70 text-amber-950 hover:border-amber-300 hover:bg-amber-100':
                      cellUiStatus === TableCellUiStatus.Warning,
                  },
                  {
                    'border-sky-200 bg-sky-100/70 text-sky-950 hover:border-sky-300 hover:bg-sky-100':
                      cellUiStatus === TableCellUiStatus.NeedsSelection,
                  },
                  {
                    'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200':
                      cellUiStatus === TableCellUiStatus.Validating,
                  }
                )}
                onClick={(event) => event.stopPropagation()}
              >
                +{overflowCount}
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            sideOffset={0}
            arrowClassName="bg-white"
            className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
          >
            <div
              data-testid="contribution-tooltip-list"
              className="max-h-64 overflow-y-auto secondary-scrollbar pr-1"
            >
              {contributions.map((entry, index) => {
                const preview = resolveContributionPreview(entry);

                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-label={`Make ${preview.label} primary contribution`}
                    className={cn(
                      'flex w-full items-start justify-between gap-3',
                      'rounded-xl border px-3 py-2 text-left transition',
                      { 'border-primary-6 bg-primary-0/10': index === 0 },
                      {
                        'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50':
                          index !== 0,
                      },
                      { 'mt-2': index > 0 }
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPromoteContribution(entry.id);
                      setTooltipOpen(false);
                    }}
                  >
                    <ContributionPreviewText entry={entry} emptyLabel="" />
                  </button>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

interface IContributionsEditorProps {
  cell: IImportCellState;
  row: IImportRowState;
  fieldPath: string;
  context: IEntityImportRuntimeContext;
  actions: IEntityImportActions;
  services: IEntityImportContributionLookupServices;
}

export function ContributionsEditor({
  cell,
  row,
  fieldPath,
  context,
  actions,
  services,
}: IContributionsEditorProps) {
  const storedEntries = useMemo(
    () =>
      (cell.parsedValue as Array<TContributionDraft> | undefined)?.length
        ? (cell.parsedValue as Array<TContributionDraft>).map((entry) => ({
            ...entry,
            id: entry.id ?? createContributionId(),
          }))
        : [createBlankContribution()],
    [cell.parsedValue]
  );

  const syncEntries = useCallback(
    (nextEntries: Array<TContributionDraft>) => {
      const rawSummaryEntries = countRenderableEntries(nextEntries);

      actions.onSetCustomValue({
        rowId: row.id,
        fieldPath,
        rawValue: summarizeContributions(rawSummaryEntries),
        parsedValue: nextEntries,
      });
    },
    [actions, fieldPath, row.id]
  );

  return (
    <div className="space-y-2 px-4">
      {storedEntries.map((entry, index) => {
        const contributorTypeId = `contribution-type-${row.id}-${entry.id}`;
        const contributorInputId = `contribution-agent-${row.id}-${entry.id}`;
        const roleInputId = `contribution-role-${row.id}-${entry.id}`;
        const contributorSearchPage = resolveContributorSearchPage(entry.agent_type, services);
        const selectedTypeLabel = CONTRIBUTOR_TYPES.find(
          (typeOption) => typeOption.value === entry.agent_type
        )?.label;

        return (
          <div
            key={entry.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
          >
            <div
              data-testid={`contribution-row-layout-${index}`}
              className="flex flex-col flex-nowrap items-center w-full gap-4"
            >
              <div className="w-full shrink-0 space-y-2">
                <div className="text-sm font-medium text-neutral-700">Contributor type</div>
                <AsyncSelect<TContributionSelectFilters, ISuggestion>
                  id={contributorTypeId}
                  ariaLabel={`Contributor type row ${row.rowIndex + 1}`}
                  dataKey={['entity-import', 'contributions', 'types']}
                  queryFn={({ filters }) => queryContributionTypes({ filters })}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select type"
                  selectedValue={entry.agent_type ?? undefined}
                  selectedLabel={selectedTypeLabel ?? entry.imported_type_text}
                  searchable={false}
                  clsx={{
                    trigger: CONTRIBUTION_TRIGGER_CLASSNAME,
                    content: CONTRIBUTION_CONTENT_CLASSNAME,
                    label: CONTRIBUTION_LABEL_CLASSNAME,
                  }}
                  onSelect={(option) => {
                    const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                      storedIndex === index
                        ? {
                            ...clearContributionImportState(storedEntry),
                            agent_type: option?.value as TAgentType | undefined,
                            agent_id: '',
                            agent_label: '',
                            role_id: option ? storedEntry.role_id : '',
                            role_label: option ? storedEntry.role_label : '',
                          }
                        : storedEntry
                    );
                    syncEntries(nextEntries);
                  }}
                />
              </div>

              <div className="min-w-0 w-full space-y-2">
                <div className="text-sm font-medium text-neutral-700">Contributor</div>
                <AsyncSelect<TContributionSelectFilters, ISuggestion>
                  id={contributorInputId}
                  ariaLabel={`Contributor row ${row.rowIndex + 1}`}
                  dataKey={
                    entry.agent_type
                      ? [
                          ...keyBuilder.agents({ agentType: entry.agent_type }),
                          'entity-import-contribution',
                        ]
                      : ['entity-import', 'contribution-agent', 'unselected']
                  }
                  queryFn={({ filters }) =>
                    querySuggestionPage({
                      filters,
                      searchField: 'pref_label__ilike',
                      context,
                      querySuggestions: contributorSearchPage,
                    })
                  }
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select contributor"
                  searchPlaceholder="Search contributor"
                  selectedValue={entry.agent_id || undefined}
                  selectedLabel={entry.agent_label || entry.imported_agent_text}
                  searchField="pref_label__ilike"
                  searchable
                  disabled={!entry.agent_type}
                  clsx={{
                    trigger: CONTRIBUTION_TRIGGER_CLASSNAME,
                    content: CONTRIBUTION_CONTENT_CLASSNAME,
                    label: CONTRIBUTION_LABEL_CLASSNAME,
                  }}
                  onSelect={(option) => {
                    const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                      storedIndex === index
                        ? {
                            ...clearContributionImportState(storedEntry),
                            agent_id: option?.value ?? '',
                            agent_label: option?.label ?? '',
                          }
                        : storedEntry
                    );
                    syncEntries(nextEntries);
                  }}
                />
              </div>

              <div className="min-w-0 w-full space-y-2">
                <div className="text-sm font-medium text-neutral-700">Role</div>
                <AsyncSelect<TContributionSelectFilters, ISuggestion>
                  id={roleInputId}
                  ariaLabel={`Role row ${row.rowIndex + 1}`}
                  dataKey={[
                    ...keyBuilder.roles({ roleType: 'contributor' }),
                    'entity-import-contribution',
                  ]}
                  queryFn={({ filters }) =>
                    querySuggestionPage({
                      filters,
                      searchField: 'query',
                      context,
                      querySuggestions: services.queryRole,
                    })
                  }
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select role"
                  searchPlaceholder="Search role"
                  selectedValue={entry.role_id || undefined}
                  selectedLabel={entry.role_label || entry.imported_role_text}
                  searchField="query"
                  searchable
                  clsx={{
                    trigger: CONTRIBUTION_TRIGGER_CLASSNAME,
                    content: CONTRIBUTION_CONTENT_CLASSNAME,
                    label: CONTRIBUTION_LABEL_CLASSNAME,
                  }}
                  onSelect={(option) => {
                    const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                      storedIndex === index
                        ? {
                            ...clearContributionImportState(storedEntry),
                            role_id: option?.value ?? '',
                            role_label: option?.label ?? '',
                          }
                        : storedEntry
                    );
                    syncEntries(nextEntries);
                  }}
                />
              </div>

              <div className="shrink-0">
                <Button
                  rounded
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'gap-2 rounded-full active:text-white',
                    storedEntries.length === 1 && 'text-neutral-400'
                  )}
                  disabled={storedEntries.length === 1}
                  onClick={() => {
                    const nextEntries = storedEntries.filter(
                      (_, storedIndex) => storedIndex !== index
                    );
                    syncEntries(nextEntries);
                  }}
                >
                  <RiDeleteBin7Line />
                  Remove
                </Button>
              </div>
            </div>

            {entry.issues.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {entry.issues[0]}
              </div>
            ) : null}
          </div>
        );
      })}

      <Button
        rounded
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto flex gap-2 rounded-full active:text-white"
        onClick={() => syncEntries([...storedEntries, createBlankContribution()])}
      >
        <RiAddCircleLine />
        Add contribution
      </Button>
    </div>
  );
}
