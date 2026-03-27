'use client';

import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { createAndRegisterMorphometrics } from '@/api/one/cell-morphology';
import {
  type CommonQueryArgs,
  createCommonEntityImportQueryServices,
  type IEntityImportSharedQueryServices,
  makeRemoteSearchResult,
  makeSuggestion,
  makeWildcardIlikeQuery,
  makeWorkspaceContext,
  resolveQueryPaging,
  type TSharedTextQueryField,
} from '@/features/entity-import/core/shared/common-query-services';

import type { TRepairPipelineState } from '@/api/entitycore/types/shared/protocol';
import type {
  IEntityImportRuntimeContext,
  IRemoteSearchPageResult,
} from '@/features/entity-import/core/adapter';
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

export interface ICellMorphologyImportServices extends IEntityImportSharedQueryServices {
  queryProtocol: (args: CommonQueryArgs<TSharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  registerMorphology: (args: {
    file: File;
    metadata: CellMorphologyRegistrationMetadata;
    context: IEntityImportRuntimeContext;
  }) => Promise<RegisterMorphologyResult>;
}

export function createCellMorphologyImportServices(): ICellMorphologyImportServices {
  const sharedServices = createCommonEntityImportQueryServices();

  return {
    ...sharedServices,
    async queryProtocol({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getProtocols({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ...(queryValue ? { [queryField]: queryValue } : {}),
        },
        context: makeWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((protocol) =>
          makeSuggestion(
            protocol.id,
            `${protocol.name ?? 'Unnamed protocol'} (${protocol.generation_type})`,
            undefined,
            {
              generationType: protocol.generation_type,
              description: protocol.description,
              protocol_document: protocol.protocol_document,
            }
          )
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async registerMorphology({ file, metadata, context }) {
      return await createAndRegisterMorphometrics(file, metadata, makeWorkspaceContext(context));
    },
  };
}
