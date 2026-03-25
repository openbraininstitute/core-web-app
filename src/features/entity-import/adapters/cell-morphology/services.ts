'use client';

import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { createMtypeClassification as createMtypeClassificationMutation } from '@/api/entitycore/queries/annotations/mtype-classification';
import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { createContribution as createContributionMutation } from '@/api/entitycore/queries/general/contribution';
import { getLicenses } from '@/api/entitycore/queries/general/license';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { getSubjects } from '@/api/entitycore/queries/general/subject';
import { createAndRegisterMorphometrics } from '@/api/one/cell-morphology';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { TRepairPipelineState } from '@/api/entitycore/types/shared/protocol';
import type { WorkspaceContext } from '@/types/common';
import type { TAgentType } from '@/ui/segments/contribute/shared/types';
import type { EntityImportRuntimeContext, RemoteSearchPageResult } from '../../core/adapter';
import type { ISuggestion } from '../../core/contracts';

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

export interface CellMorphologyImportServices {
  searchBrainRegions: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchBrainRegionsPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchLicenses: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchLicensesPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchSubjects: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchSubjectsPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchProtocols: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchProtocolsPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchMtypes: (query: string, context: EntityImportRuntimeContext) => Promise<Array<ISuggestion>>;
  searchMtypesPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchPersons: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchPersonsPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchOrganizations: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchOrganizationsPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchConsortia: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchConsortiaPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
  searchRoles: (query: string, context: EntityImportRuntimeContext) => Promise<Array<ISuggestion>>;
  searchRolesPage: (
    query: string,
    context: EntityImportRuntimeContext,
    pageParam: number,
    pageSize: number
  ) => Promise<RemoteSearchPageResult>;
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

function toSuggestion(
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

function filterSuggestions(suggestions: Array<ISuggestion>, query: string): Array<ISuggestion> {
  return filterSuggestionsAll(suggestions, query).slice(0, 12);
}

function filterSuggestionsAll(suggestions: Array<ISuggestion>, query: string): Array<ISuggestion> {
  const normalizedQuery = normalizeQuery(query);
  return suggestions.filter((suggestion) => {
    const haystack = `${suggestion.label} ${suggestion.description ?? ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function flattenBrainRegions(node: IBrainRegionHierarchy): Array<IBrainRegionHierarchy> {
  return [node, ...(node.children?.flatMap(flattenBrainRegions) ?? [])];
}

/**
 * Entity Core does not expose a paginated brain-region search like `/license` or
 * `/cell-morphology-protocol`. We load the default hierarchy once (UUID ids for
 * registration), then paginate filtered matches in memory with the same offset-based
 * `pageParam` / `nextPageParam` contract as server-paged fields.
 */
let brainRegionFlatSuggestionsPromise: Promise<Array<ISuggestion>> | null = null;

function getBrainRegionFlatSuggestions(): Promise<Array<ISuggestion>> {
  brainRegionFlatSuggestionsPromise ??= (async () => {
    const hierarchy = await getBrainRegionHierarchy({});
    return flattenBrainRegions(hierarchy).map((region) =>
      toSuggestion(region.id, region.name, region.acronym ?? undefined)
    );
  })();
  return brainRegionFlatSuggestionsPromise;
}

function slicePage(
  items: Array<ISuggestion>,
  pageParam: number,
  pageSize: number
): RemoteSearchPageResult {
  const suggestions = items.slice(pageParam, pageParam + pageSize);
  const nextPageParam = pageParam + pageSize < items.length ? pageParam + pageSize : null;
  return { suggestions, nextPageParam };
}

export function createCellMorphologyImportServices(): CellMorphologyImportServices {
  return {
    async searchBrainRegions(query) {
      const suggestions = await getBrainRegionFlatSuggestions();
      return filterSuggestions(suggestions, query);
    },
    async searchBrainRegionsPage(query, _context, pageParam, pageSize) {
      const suggestions = await getBrainRegionFlatSuggestions();
      const filtered = filterSuggestionsAll(suggestions, query);
      return slicePage(filtered, pageParam, pageSize);
    },
    async searchLicenses(query, context) {
      const response = await getLicenses({
        filters: {
          page: 1,
          page_size: 20,
          ...(query.trim() ? { ilike_search: query } : {}),
        },
        context: toWorkspaceContext(context),
      });

      return response.data.map((license) =>
        toSuggestion(license.id, license.label ?? license.name)
      );
    },
    async searchLicensesPage(query, context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getLicenses({
        filters: {
          page,
          page_size: pageSize,
          ...(query.trim() ? { ilike_search: `*${query}*` } : {}),
        },
        context: toWorkspaceContext(context),
      });

      const suggestions = response.data.map((license) =>
        toSuggestion(license.id, license.label ?? license.name)
      );
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchSubjects(query, context) {
      const response = await getSubjects({
        filters: {
          page: 1,
          page_size: 20,
          ilike_search: `*${query}*`,
        },
        context: toWorkspaceContext(context),
      });

      return response.data
        .filter((subject) => subject.name.trim().toLowerCase() !== 'unknown')
        .map((subject) => toSuggestion(subject.id, subject.name));
    },
    async searchSubjectsPage(query, context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getSubjects({
        filters: {
          page,
          page_size: pageSize,
          ilike_search: `*${query}*`,
        },
        context: toWorkspaceContext(context),
      });

      const suggestions = response.data
        .filter((subject) => subject.name.trim().toLowerCase() !== 'unknown')
        .map((subject) => toSuggestion(subject.id, subject.name));
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchProtocols(query, context) {
      const response = await getProtocols({
        filters: {
          page: 1,
          page_size: 20,
          ...(query.trim() ? { ilike_search: `*${query}*` } : {}),
        },
        context: toWorkspaceContext(context),
      });

      return response.data.map((protocol) =>
        toSuggestion(
          protocol.id,
          `${protocol.name ?? 'Unnamed protocol'} (${protocol.generation_type})`,
          undefined,
          {
            generationType: protocol.generation_type,
          }
        )
      );
    },
    async searchProtocolsPage(query, context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getProtocols({
        filters: {
          page,
          page_size: pageSize,
          ...(query.trim() ? { ilike_search: `*${query}*` } : {}),
        },
        context: toWorkspaceContext(context),
      });

      const suggestions = response.data.map((protocol) =>
        toSuggestion(
          protocol.id,
          `${protocol.name ?? 'Unnamed protocol'} (${protocol.generation_type})`,
          undefined,
          {
            generationType: protocol.generation_type,
          }
        )
      );
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchMtypes(query, context) {
      const response = await getMtypes({
        filters: {
          page: 1,
          page_size: 20,
          ilike_search: `*${query}*`,
        },
        ctx: toWorkspaceContext(context),
      });

      return response.data.map((mtype) =>
        toSuggestion(mtype.id, mtype.pref_label, mtype.alt_label ?? undefined)
      );
    },
    async searchMtypesPage(query, context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getMtypes({
        filters: {
          page,
          page_size: pageSize,
          ilike_search: `*${query}*`,
        },
        ctx: toWorkspaceContext(context),
      });

      const suggestions = response.data.map((mtype) =>
        toSuggestion(mtype.id, mtype.pref_label, mtype.alt_label ?? undefined)
      );
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchPersons(query) {
      const response = await getPersons({
        filters: {
          page: 1,
          page_size: 20,
          pref_label__ilike: query,
        },
      });

      return response.data.map((person) => toSuggestion(person.id, person.pref_label));
    },
    async searchPersonsPage(query, _context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getPersons({
        filters: {
          page,
          page_size: pageSize,
          pref_label__ilike: query,
        },
      });

      const suggestions = response.data.map((person) => toSuggestion(person.id, person.pref_label));
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchOrganizations(query) {
      const response = await getOrganizations({
        filters: {
          page: 1,
          page_size: 20,
          pref_label__ilike: query,
        },
      });

      return response.data.map((organization) =>
        toSuggestion(organization.id, organization.pref_label)
      );
    },
    async searchOrganizationsPage(query, _context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getOrganizations({
        filters: {
          page,
          page_size: pageSize,
          pref_label__ilike: query,
        },
      });

      const suggestions = response.data.map((organization) =>
        toSuggestion(organization.id, organization.pref_label)
      );
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchConsortia(query) {
      const response = await getConsortia({
        filters: {
          page: 1,
          page_size: 20,
          pref_label__ilike: query,
        },
      });

      return response.data.map((consortium) => toSuggestion(consortium.id, consortium.pref_label));
    },
    async searchConsortiaPage(query, _context, pageParam, pageSize) {
      const page = Math.floor(pageParam / pageSize) + 1;
      const response = await getConsortia({
        filters: {
          page,
          page_size: pageSize,
          pref_label__ilike: query,
        },
      });

      const suggestions = response.data.map((consortium) =>
        toSuggestion(consortium.id, consortium.pref_label)
      );
      return {
        suggestions,
        nextPageParam: suggestions.length === pageSize ? pageParam + suggestions.length : null,
      };
    },
    async searchRoles(query, context) {
      const response = await getRoles({
        filters: {
          page: 1,
          page_size: 100,
        },
        context: toWorkspaceContext(context),
      });

      return filterSuggestions(
        response.data.map((role) => toSuggestion(role.id, role.name)),
        query
      );
    },
    async searchRolesPage(query, context, pageParam, pageSize) {
      const response = await getRoles({
        filters: {
          page: 1,
          page_size: 100,
        },
        context: toWorkspaceContext(context),
      });

      const all = filterSuggestionsAll(
        response.data.map((role) => toSuggestion(role.id, role.name)),
        query
      );
      return slicePage(all, pageParam, pageSize);
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
