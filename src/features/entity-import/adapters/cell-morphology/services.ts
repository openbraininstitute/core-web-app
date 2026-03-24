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
import type { WorkspaceContext } from '@/types/common';
import type { TAgentType } from '@/ui/segments/contribute/shared/types';
import type { EntityImportRuntimeContext } from '../../core/adapter';
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
  searchLicenses: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchSubjects: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchProtocols: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchMtypes: (query: string, context: EntityImportRuntimeContext) => Promise<Array<ISuggestion>>;
  searchPersons: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchOrganizations: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchConsortia: (
    query: string,
    context: EntityImportRuntimeContext
  ) => Promise<Array<ISuggestion>>;
  searchRoles: (query: string, context: EntityImportRuntimeContext) => Promise<Array<ISuggestion>>;
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

function toSuggestion(value: string, label: string, description?: string): ISuggestion {
  return {
    value,
    label,
    description,
  };
}

function filterSuggestions(suggestions: Array<ISuggestion>, query: string): Array<ISuggestion> {
  const normalizedQuery = normalizeQuery(query);
  return suggestions
    .filter((suggestion) => {
      const haystack = `${suggestion.label} ${suggestion.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 12);
}

function flattenBrainRegions(node: IBrainRegionHierarchy): Array<IBrainRegionHierarchy> {
  return [node, ...(node.children?.flatMap(flattenBrainRegions) ?? [])];
}

export function createCellMorphologyImportServices(): CellMorphologyImportServices {
  return {
    async searchBrainRegions(query) {
      const hierarchy = await getBrainRegionHierarchy({});

      const suggestions = flattenBrainRegions(hierarchy).map((region) =>
        toSuggestion(region.id, region.name, region.acronym ?? undefined)
      );

      return filterSuggestions(suggestions, query);
    },
    async searchLicenses(query, context) {
      const response = await getLicenses({
        filters: {
          page: 1,
          page_size: 20,
          ilike_search: query,
        },
        context: toWorkspaceContext(context),
      });

      return response.data.map((license) =>
        toSuggestion(license.id, license.label ?? license.name)
      );
    },
    async searchSubjects(query, context) {
      const response = await getSubjects({
        filters: {
          page: 1,
          page_size: 20,
          search: query,
        },
        context: toWorkspaceContext(context),
      });

      return response.data
        .filter((subject) => subject.name.trim().toLowerCase() !== 'unknown')
        .map((subject) => toSuggestion(subject.id, subject.name));
    },
    async searchProtocols(query, context) {
      const response = await getProtocols({
        filters: {
          page: 1,
          page_size: 20,
          ilike_search: query,
        },
        context: toWorkspaceContext(context),
      });

      return response.data.map((protocol) =>
        toSuggestion(
          protocol.id,
          `${protocol.name ?? 'Unnamed protocol'} (${protocol.generation_type})`
        )
      );
    },
    async searchMtypes(query, context) {
      const response = await getMtypes({
        filters: {
          page: 1,
          page_size: 20,
          ilike_search: query,
        },
        ctx: toWorkspaceContext(context),
      });

      return response.data.map((mtype) =>
        toSuggestion(mtype.id, mtype.pref_label, mtype.alt_label ?? undefined)
      );
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
