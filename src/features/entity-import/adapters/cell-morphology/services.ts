'use client';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { createMtypeClassification as createMtypeClassificationMutation } from '@/api/entitycore/queries/annotations/mtype-classification';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { createContribution as createContributionMutation } from '@/api/entitycore/queries/general/contribution';
import { getLicenses } from '@/api/entitycore/queries/general/license';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { getSubjects } from '@/api/entitycore/queries/general/subject';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { createAndRegisterMorphometrics } from '@/api/one/cell-morphology';

import type { TRepairPipelineState } from '@/api/entitycore/types/shared/protocol';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IRoleFilter } from '@/api/entitycore/types/shared/role';
import type {
  EntityImportRuntimeContext,
  RemoteSearchPageResult,
} from '@/features/entity-import/core/adapter';
import type { ISuggestion } from '@/features/entity-import/core/contracts';
import type { WorkspaceContext } from '@/types/common';
import type { TAgentType } from '@/ui/segments/contribute/shared/types';

export interface CellMorphologyContributionInput {
  agent_type: TAgentType;
  agent_id: string;
  role_id: string;
}

export interface CellMorphologyRegistrationMetadata {
  name: string;
  description: string;
  brain_region_id: string;
  cell_morphology_protocol_id: string;
  subject_id: string;
  license_id: string;
  experiment_date: string | null;
  contact_email: string | null;
  published_in: string | null;
  location: { x: number; y: number; z: number } | null;
  repair_pipeline_state: TRepairPipelineState | null;
}

export interface RegisterMorphologyResult {
  id: string;
  isValid: boolean;
}

type BrainRegionQueryField = 'semantic_search' | 'name__ilike';
type TextQueryField = 'ilike_search';
type PrefLabelQueryField = 'pref_label__ilike';
type RoleQueryField = 'query';

interface QueryArgs<TQueryField extends string> {
  query: string;
  queryField: TQueryField;
  context: EntityImportRuntimeContext;
  pageParam?: number;
  pageSize?: number;
}

export interface ICellMorphologyImportServices {
  queryBrainRegion: (args: QueryArgs<BrainRegionQueryField>) => Promise<RemoteSearchPageResult>;
  queryLicense: (args: QueryArgs<TextQueryField>) => Promise<RemoteSearchPageResult>;
  querySubject: (args: QueryArgs<TextQueryField>) => Promise<RemoteSearchPageResult>;
  queryProtocol: (args: QueryArgs<TextQueryField>) => Promise<RemoteSearchPageResult>;
  queryMtype: (args: QueryArgs<TextQueryField>) => Promise<RemoteSearchPageResult>;
  queryPerson: (args: QueryArgs<PrefLabelQueryField>) => Promise<RemoteSearchPageResult>;
  queryOrganization: (args: QueryArgs<PrefLabelQueryField>) => Promise<RemoteSearchPageResult>;
  queryConsortium: (args: QueryArgs<PrefLabelQueryField>) => Promise<RemoteSearchPageResult>;
  queryRole: (args: QueryArgs<RoleQueryField>) => Promise<RemoteSearchPageResult>;
  registerMorphology: (args: {
    file: File;
    metadata: CellMorphologyRegistrationMetadata;
    context: EntityImportRuntimeContext;
  }) => Promise<RegisterMorphologyResult>;
  createContribution: (args: {
    entityId: string;
    contribution: CellMorphologyContributionInput;
    context: EntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
  createMtypeClassification: (args: {
    entityId: string;
    mtypeClassId: string;
    context: EntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
}

function toWorkspaceContext(context: EntityImportRuntimeContext): WorkspaceContext {
  return {
    projectId: context.projectId,
    virtualLabId: context.virtualLabId,
  } as WorkspaceContext;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function makeSuggestion(
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

type BrainRegionQueryResponseItem = {
  id: string;
  name: string;
  acronym?: string | null;
};

function resolveQueryPaging({
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

function makeRemoteSearchResult({
  suggestions,
  pageParam,
  pageSize,
  totalItems,
}: {
  suggestions: Array<ISuggestion>;
  pageParam: number;
  pageSize: number;
  totalItems?: number | null;
}): RemoteSearchPageResult {
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

function makeWildcardIlikeQuery(query: string): string | null {
  const normalizedQuery = query.trim();
  return normalizedQuery ? `*${normalizedQuery}*` : null;
}

function makePlainQuery(query: string): string | null {
  const normalizedQuery = query.trim();
  return normalizedQuery ? normalizedQuery : null;
}

export function createCellMorphologyImportServices(): ICellMorphologyImportServices {
  return {
    async queryBrainRegion({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const api = await entityCoreApi();
      const queryValue = makePlainQuery(query);
      // FIXME: this need to be using the new brain-region query in entitycore api folder
      const response = await api.get<EntityCoreResponse<BrainRegionQueryResponseItem>>(
        '/brain-region',
        {
          queryParams: {
            page: paging.page,
            page_size: paging.pageSize,
            ...(queryValue ? { [queryField]: queryValue } : {}),
          },
          headers: getEntityCoreContext(toWorkspaceContext(context)).headers,
        }
      );

      return makeRemoteSearchResult({
        suggestions: response.data.map((region) =>
          makeSuggestion(region.id, region.name, region.acronym ?? undefined)
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
          .map((subject) => makeSuggestion(subject.id, subject.name)),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async queryProtocol({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getProtocols({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: toWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((protocol) =>
          makeSuggestion(
            protocol.id,
            `${protocol.name ?? 'Unnamed protocol'} (${protocol.generation_type})`,
            undefined,
            {
              generationType: protocol.generation_type,
            }
          )
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
          [queryField]: queryValue,
        },
        ctx: toWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((mtype) =>
          makeSuggestion(mtype.id, mtype.pref_label, mtype.alt_label ?? undefined)
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
    async registerMorphology({ file, metadata, context }) {
      return await createAndRegisterMorphometrics(file, metadata, toWorkspaceContext(context));
    },
    async createContribution({ entityId, contribution, context }) {
      const createdContribution = await createContributionMutation({
        context: toWorkspaceContext(context),
        contributor: {
          agent_id: contribution.agent_id,
          role_id: contribution.role_id,
          entity_id: entityId,
        },
      });

      return { id: createdContribution.id };
    },
    async createMtypeClassification({ entityId, mtypeClassId, context }) {
      const classification = await createMtypeClassificationMutation({
        context: toWorkspaceContext(context),
        payload: {
          authorized_public: true,
          entity_id: entityId,
          mtype_class_id: mtypeClassId,
        },
      });

      return { id: classification.id };
    },
  };
}
