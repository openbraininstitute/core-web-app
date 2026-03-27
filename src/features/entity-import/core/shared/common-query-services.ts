'use client';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { getBrainRegions } from '@/api/entitycore/queries/general/brain-region';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { getLicenses } from '@/api/entitycore/queries/general/license';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { getSubjects } from '@/api/entitycore/queries/general/subject';

import type { IRoleFilter } from '@/api/entitycore/types/shared/role';
import type {
  IEntityImportRuntimeContext,
  IRemoteSearchPageResult,
} from '@/features/entity-import/core/adapter';
import type { ISuggestion } from '@/features/entity-import/core/contracts';
import type { WorkspaceContext } from '@/types/common';

export type BrainRegionQueryField = 'semantic_search' | 'name__ilike';
export type SharedTextQueryField = 'ilike_search' | 'label__ilike' | 'pref_label__ilike';
export type PrefLabelQueryField = 'pref_label__ilike';
export type RoleQueryField = 'query' | 'name__ilike';

export interface CommonQueryArgs<TQueryField extends string> {
  query: string;
  queryField: TQueryField;
  context: IEntityImportRuntimeContext;
  pageParam?: number;
  pageSize?: number;
}

export interface IEntityImportSharedQueryServices {
  queryBrainRegion: (
    args: CommonQueryArgs<BrainRegionQueryField>
  ) => Promise<IRemoteSearchPageResult>;
  queryLicense: (args: CommonQueryArgs<SharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  querySubject: (args: CommonQueryArgs<SharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  queryMtype: (args: CommonQueryArgs<SharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  queryPerson: (args: CommonQueryArgs<PrefLabelQueryField>) => Promise<IRemoteSearchPageResult>;
  queryOrganization: (
    args: CommonQueryArgs<PrefLabelQueryField>
  ) => Promise<IRemoteSearchPageResult>;
  queryConsortium: (args: CommonQueryArgs<PrefLabelQueryField>) => Promise<IRemoteSearchPageResult>;
  queryRole: (args: CommonQueryArgs<RoleQueryField>) => Promise<IRemoteSearchPageResult>;
}

export type IEntityImportContributionLookupServices = Pick<
  IEntityImportSharedQueryServices,
  'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
>;

export function toWorkspaceContext(context: IEntityImportRuntimeContext): WorkspaceContext {
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

export function createCommonEntityImportQueryServices(): IEntityImportSharedQueryServices {
  return {
    async queryBrainRegion({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makePlainQuery(query);
      const response = await getBrainRegions({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: toWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((region) =>
          makeSuggestion(region.id, region.name, region.acronym ?? undefined, {
            acronym: region.acronym ?? null,
            species: region.species?.name ?? null,
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
        context: toWorkspaceContext(context),
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
    async querySubject({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getSubjects({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: toWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data
          .filter((subject) => normalizeQuery(subject.name) !== 'unknown')
          .map((subject) =>
            makeSuggestion(subject.id, subject.name, subject.description, {
              species: subject.species?.name ?? null,
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
        ctx: toWorkspaceContext(context),
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
        context: toWorkspaceContext(context),
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
