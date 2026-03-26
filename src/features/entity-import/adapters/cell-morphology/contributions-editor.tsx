'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useCallback, useMemo } from 'react';

import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import { AsyncSelect } from '@/ui/molecules/async-select';
import { Button } from '@/ui/molecules/button';
import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ParsedContributionCsvEntry } from '@/features/entity-import/adapters/cell-morphology/csv-tuple-parser';
import type {
  CellMorphologyContributionInput,
  ICellMorphologyImportServices,
} from '@/features/entity-import/adapters/cell-morphology/services';
import type {
  EntityImportActions,
  EntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
import type {
  IImportCellState,
  IImportRowState,
  ISuggestion,
} from '@/features/entity-import/core/contracts';

export type ContributionDraft = ParsedContributionCsvEntry &
  Partial<Pick<CellMorphologyContributionInput, 'agent_type' | 'agent_id' | 'role_id'>>;

type ContributionSelectFilters = Partial<PaginationFilter & SearchFilter> & {
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

function createBlankContribution(): ContributionDraft {
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

function isRenderableContribution(entry: ContributionDraft): boolean {
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

export function summarizeContributions(entries: Array<ContributionDraft>): string {
  const completedEntries = entries.filter(
    (entry) => entry.agent_type && entry.agent_id && entry.role_id
  );

  if (completedEntries.length === 0) {
    return '';
  }

  return `${completedEntries.length} contributor${completedEntries.length === 1 ? '' : 's'}`;
}

export function countRenderableEntries(
  entries: Array<ContributionDraft>
): Array<ContributionDraft> {
  return entries.filter(isRenderableContribution);
}

export function getRenderableContributionEntries(entries: unknown): Array<ContributionDraft> {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry): entry is ContributionDraft => Boolean(entry))
    .filter(isRenderableContribution);
}

function clearContributionImportState(entry: ContributionDraft): ContributionDraft {
  return {
    ...entry,
    imported_agent_text: undefined,
    imported_role_text: undefined,
    imported_type_text: undefined,
    issues: [],
  };
}

export function promoteContributionToPrimary(
  entries: Array<ContributionDraft>,
  contributionId: string
): Array<ContributionDraft> {
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

function readPagedFilters(filters: ContributionSelectFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.page_size ?? 10, 1);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

function readFilterQuery(filters: ContributionSelectFilters, key: 'pref_label__ilike' | 'query') {
  const value = filters[key];
  return typeof value === 'string' ? value : '';
}

async function queryContributionTypes({
  filters,
}: {
  filters: ContributionSelectFilters;
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
  filters: ContributionSelectFilters;
  searchField: TQueryField;
  context: EntityImportRuntimeContext;
  querySuggestions?:
    | ((args: {
        query: string;
        queryField: TQueryField;
        context: EntityImportRuntimeContext;
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
  services: Pick<
    ICellMorphologyImportServices,
    'queryPerson' | 'queryOrganization' | 'queryConsortium'
  >
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

interface ContributionsEditorProps {
  cell: IImportCellState;
  row: IImportRowState;
  fieldPath: string;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
  services: Pick<
    ICellMorphologyImportServices,
    'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
  >;
}

export function ContributionsEditor({
  cell,
  row,
  fieldPath,
  context,
  actions,
  services,
}: ContributionsEditorProps) {
  const storedEntries = useMemo(
    () =>
      (cell.parsedValue as Array<ContributionDraft> | undefined)?.length
        ? (cell.parsedValue as Array<ContributionDraft>).map((entry) => ({
            ...entry,
            id: entry.id ?? createContributionId(),
          }))
        : [createBlankContribution()],
    [cell.parsedValue]
  );

  const syncEntries = useCallback(
    (nextEntries: Array<ContributionDraft>) => {
      const rawSummaryEntries = countRenderableEntries(nextEntries);

      actions.setCustomValue({
        rowId: row.id,
        fieldPath,
        rawValue: summarizeContributions(rawSummaryEntries),
        parsedValue: nextEntries,
      });
    },
    [actions, fieldPath, row.id]
  );

  return (
    <div className="space-y-4 px-4 pb-4">
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
            className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-xs"
          >
            <div
              data-testid={`contribution-row-layout-${index}`}
              className="flex flex-col flex-nowrap items-center w-full gap-4"
            >
              <div className="w-full shrink-0 space-y-2">
                <div className="text-sm font-medium text-neutral-700">Contributor type</div>
                <AsyncSelect<ContributionSelectFilters, ISuggestion>
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
                <AsyncSelect<ContributionSelectFilters, ISuggestion>
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
                <AsyncSelect<ContributionSelectFilters, ISuggestion>
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
                    'gap-2 rounded-full',
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
                  <DeleteOutlined />
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
        className="ml-auto flex gap-2 rounded-full"
        onClick={() => syncEntries([...storedEntries, createBlankContribution()])}
      >
        <PlusOutlined />
        Add contribution
      </Button>
    </div>
  );
}
