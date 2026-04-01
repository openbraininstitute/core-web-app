'use client';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import {
  getBrainRegionHierarchies,
  getBrainRegions,
} from '@/api/entitycore/queries/general/brain-region';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { getLicenses } from '@/api/entitycore/queries/general/license';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { getSpecies } from '@/api/entitycore/queries/general/species';
import { getSubjects } from '@/api/entitycore/queries/general/subject';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IRoleFilter } from '@/api/entitycore/types/shared/role';
import type {
  IEntityImportRuntimeContext,
  IRemoteSearchPageResult,
} from '@/features/entity-import/core/adapter';
import type {
  IImportRowState,
  ISuggestion,
  TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import type { WorkspaceContext } from '@/types/common';

export type TBrainRegionQueryField = 'semantic_search' | 'name__ilike';
export type TSharedTextQueryField = 'ilike_search' | 'label__ilike' | 'pref_label__ilike';
export type TPrefLabelQueryField = 'pref_label__ilike';
export type TRoleQueryField = 'query' | 'name__ilike';

export interface CommonQueryArgs<TQueryField extends string> {
  query: string;
  queryField: TQueryField;
  context: IEntityImportRuntimeContext;
  pageParam?: number;
  pageSize?: number;
  row?: IImportRowState;
  values?: TFlatImportValues;
  filters?: {
    speciesId?: string | null;
  };
}

export interface IEntityImportSharedQueryServices {
  querySpecies: (args: { context: IEntityImportRuntimeContext }) => Promise<Array<ISuggestion>>;
  queryBrainRegion: (
    args: CommonQueryArgs<TBrainRegionQueryField>
  ) => Promise<IRemoteSearchPageResult>;
  queryLicense: (args: CommonQueryArgs<TSharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  querySubject: (args: CommonQueryArgs<TSharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  queryMtype: (args: CommonQueryArgs<TSharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  queryPerson: (args: CommonQueryArgs<TPrefLabelQueryField>) => Promise<IRemoteSearchPageResult>;
  queryOrganization: (
    args: CommonQueryArgs<TPrefLabelQueryField>
  ) => Promise<IRemoteSearchPageResult>;
  queryConsortium: (
    args: CommonQueryArgs<TPrefLabelQueryField>
  ) => Promise<IRemoteSearchPageResult>;
  queryRole: (args: CommonQueryArgs<TRoleQueryField>) => Promise<IRemoteSearchPageResult>;
}

export type IEntityImportContributionLookupServices = Pick<
  IEntityImportSharedQueryServices,
  'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
>;

export function makeWorkspaceContext(context: IEntityImportRuntimeContext): WorkspaceContext {
  return {
    projectId: context.projectId,
    virtualLabId: context.virtualLabId,
  } as WorkspaceContext;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function makeSuggestion(
  value: string,
  label: string,
  description?: string,
  metadata?: Record<string, unknown>
): ISuggestion {
  return {
    value,
    label,
    description,
    metadata,
  };
}

const DEFAULT_ENTITY_IMPORT_QUERY_PAGE_SIZE = 20;
const DEFAULT_ENTITY_IMPORT_LOOKUP_PAGE_SIZE = 100;

export function resolveQueryPaging({
  pageParam = 0,
  pageSize = DEFAULT_ENTITY_IMPORT_QUERY_PAGE_SIZE,
}: {
  pageParam?: number;
  pageSize?: number;
}) {
  const normalizedPageSize = Math.max(pageSize, 1);
  const normalizedPageParam = Math.max(pageParam, 0);

  return {
    page: Math.floor(normalizedPageParam / normalizedPageSize) + 1,
    pageParam: normalizedPageParam,
    pageSize: normalizedPageSize,
  };
}

function makeNextPageParam({
  pageParam,
  pageSize,
  suggestionsCount,
  totalItems,
}: {
  pageParam: number;
  pageSize: number;
  suggestionsCount: number;
  totalItems?: number | null;
}) {
  if (typeof totalItems === 'number') {
    return pageParam + pageSize < totalItems ? pageParam + pageSize : null;
  }

  return suggestionsCount === pageSize ? pageParam + pageSize : null;
}

export function makeRemoteSearchResult({
  suggestions,
  pageParam,
  pageSize,
  totalItems,
}: {
  suggestions: Array<ISuggestion>;
  pageParam: number;
  pageSize: number;
  totalItems?: number | null;
}): IRemoteSearchPageResult {
  return {
    suggestions,
    nextPageParam: makeNextPageParam({
      pageParam,
      pageSize,
      suggestionsCount: suggestions.length,
      totalItems,
    }),
  };
}

export function makeWildcardIlikeQuery(query: string): string | null {
  const normalizedQuery = query.trim();
  return normalizedQuery ? `*${normalizedQuery}*` : null;
}

export function makePlainQuery(query: string): string | null {
  const normalizedQuery = query.trim();
  return normalizedQuery ? normalizedQuery : null;
}

async function fetchAllPages<T>({
  fetchPage,
  pageSize = DEFAULT_ENTITY_IMPORT_LOOKUP_PAGE_SIZE,
}: {
  fetchPage: (args: { page: number; pageSize: number }) => Promise<EntityCoreResponse<T>>;
  pageSize?: number;
}): Promise<Array<T>> {
  const items: Array<T> = [];
  let page = 1;
  let totalItems = 0;

  do {
    const response = await fetchPage({ page, pageSize });
    items.push(...response.data);
    totalItems = response.pagination.total_items;
    page += 1;
  } while (items.length < totalItems);

  return items;
}

export function createCommonEntityImportQueryServices(): IEntityImportSharedQueryServices {
  return {
    async querySpecies({ context }) {
      const workspaceContext = makeWorkspaceContext(context);
      const species = await fetchAllPages({
        fetchPage: ({ page, pageSize }) =>
          getSpecies({
            filters: {
              page,
              page_size: pageSize,
            },
            context: workspaceContext,
          }),
      });
      const hierarchies = await getBrainRegionHierarchies({
        filters: {
          page: 1,
          page_size: 10,
          species_id__in: species.map((item) => item.id),
        },
        context: workspaceContext,
      });
      const hierarchyBackedSpeciesIds = new Set<string>(
        hierarchies.data.map((item) => item.species.id)
      );
      const suggestions = species.map((item) =>
        makeSuggestion(item.id, item.name, undefined, {
          disabled: !hierarchyBackedSpeciesIds.has(item.id),
        })
      );
      suggestions.sort((left, right) => {
        const leftDisabled = Boolean(
          (left.metadata as { disabled?: boolean } | undefined)?.disabled
        );
        const rightDisabled = Boolean(
          (right.metadata as { disabled?: boolean } | undefined)?.disabled
        );
        if (leftDisabled !== rightDisabled) {
          return leftDisabled ? 1 : -1;
        }
        return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
      });

      return suggestions;
    },
    async queryBrainRegion({ query, queryField, context, pageParam, pageSize, filters }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getBrainRegions({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          species__id: filters?.speciesId ?? null,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((region) =>
          makeSuggestion(region.id, region.name, region.acronym ?? undefined, {
            acronym: region.acronym ?? null,
            species: region.species?.name ?? null,
            speciesId: region.species?.id ?? null,
          })
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryLicense({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getLicenses({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((license) =>
          makeSuggestion(license.id, license.label ?? license.name)
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async querySubject({ query, queryField, context, pageParam, pageSize, filters }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getSubjects({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          species__id: filters?.speciesId ?? null,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data
          .filter((subject) => normalizeQuery(subject.name) !== 'unknown')
          .map((subject) =>
            makeSuggestion(subject.id, subject.name, subject.description, {
              species: subject.species?.name ?? null,
              speciesId: subject.species?.id ?? null,
              strain: subject.strain?.name ?? null,
              sex: subject.sex,
              age: subject.age_value ? `${(subject.age_value ?? 0) / 86400} days` : null,
            })
          ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryMtype({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getMtypes({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ilike_search: queryValue,
          ...(queryField !== 'ilike_search' && queryValue ? { [queryField]: queryValue } : {}),
        },
        ctx: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((mtype) =>
          makeSuggestion(mtype.id, mtype.pref_label, mtype.alt_label ?? undefined, {
            definition: mtype.definition ?? null,
          })
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryPerson({ query, queryField, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getPersons({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((person) => makeSuggestion(person.id, person.pref_label)),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryOrganization({ query, queryField, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getOrganizations({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((organization) =>
          makeSuggestion(organization.id, organization.pref_label)
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryConsortium({ query, queryField, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getConsortia({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((consortium) =>
          makeSuggestion(consortium.id, consortium.pref_label)
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryRole({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getRoles({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        } as Partial<IRoleFilter> & { query?: string },
        context: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((role) => makeSuggestion(role.id, role.name)),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
  };
}
