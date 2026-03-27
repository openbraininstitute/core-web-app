'use client';

import { createMtypeClassification as createMtypeClassificationMutation } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createContribution as createContributionMutation } from '@/api/entitycore/queries/general/contribution';
import { makeWorkspaceContext } from '@/features/entity-import/core/shared/common-query-services';

import type { IEntityImportRuntimeContext } from '@/features/entity-import/core/adapter';

export interface IEntityImportContributionActionInput {
  agent_id: string;
  role_id: string;
}

export interface IEntityImportPostSubmitActions {
  createContribution: (args: {
    entityId: string;
    contribution: IEntityImportContributionActionInput;
    context: IEntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
  createMtypeClassification: (args: {
    entityId: string;
    mtypeClassId: string;
    context: IEntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
}

export function createEntityImportPostSubmitActions(): IEntityImportPostSubmitActions {
  return {
    async createContribution({ entityId, contribution, context }) {
      const createdContribution = await createContributionMutation({
        context: makeWorkspaceContext(context),
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
        context: makeWorkspaceContext(context),
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
