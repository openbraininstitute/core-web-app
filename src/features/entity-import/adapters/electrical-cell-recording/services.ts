'use client';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { createEtypeClassification } from '@/api/entitycore/queries/annotations/etype-classification';
import { createAsset } from '@/api/entitycore/queries/assets';
import { createElectricalCellRecording } from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  type CommonQueryArgs,
  createCommonEntityImportQueryServices,
  type IEntityImportSharedQueryServices,
  makeRemoteSearchResult,
  makeSuggestion,
  makeWildcardIlikeQuery,
  resolveQueryPaging,
  type TSharedTextQueryField,
  toWorkspaceContext,
} from '@/features/entity-import/core/shared/common-query-services';

import type {
  IEntityImportRuntimeContext,
  IRemoteSearchPageResult,
} from '@/features/entity-import/core/adapter';

export interface ElectricalCellRecordingRegistrationMetadata {
  name: string;
  description: string;
  brain_region_id: string;
  subject_id: string;
  license_id: string;
  experiment_date: string | null;
  contact_email: string | null;
  published_in: string | null;
  location: { x: number; y: number; z: number } | null;
  recording_location: Array<string>;
  recording_type: string;
  recording_origin: string;
  temperature: number | null;
  ljp: number;
  comment: string | null;
}

export interface IElectricalCellRecordingImportServices extends IEntityImportSharedQueryServices {
  queryEtype: (args: CommonQueryArgs<TSharedTextQueryField>) => Promise<IRemoteSearchPageResult>;
  registerRecording: (args: {
    metadata: ElectricalCellRecordingRegistrationMetadata;
    context: IEntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
  createEtypeClassification: (args: {
    entityId: string;
    etypeClassId: string;
    context: IEntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
  uploadAsset: (args: {
    entityId: string;
    file: File;
    context: IEntityImportRuntimeContext;
  }) => Promise<{ id: string }>;
}

export function createElectricalCellRecordingImportServices(): IElectricalCellRecordingImportServices {
  const sharedServices = createCommonEntityImportQueryServices();

  return {
    ...sharedServices,
    async queryEtype({ query, queryField, context, pageParam, pageSize }) {
      const paging = resolveQueryPaging({ pageParam, pageSize });
      const queryValue = makeWildcardIlikeQuery(query);
      const response = await getEtypes({
        filters: {
          page: paging.page,
          page_size: paging.pageSize,
          ilike_search: queryValue,
          ...(queryField !== 'ilike_search' && queryValue ? { [queryField]: queryValue } : {}),
        },
        ctx: toWorkspaceContext(context),
      });

      return makeRemoteSearchResult({
        suggestions: response.data.map((etype) =>
          makeSuggestion(etype.id, etype.pref_label, etype.alt_label, {
            definition: etype.definition ?? null,
          })
        ),
        pageParam: paging.pageParam,
        pageSize: paging.pageSize,
        totalItems: response.pagination.total_items,
      });
    },
    async registerRecording({ metadata, context }) {
      const result = await createElectricalCellRecording({
        context: toWorkspaceContext(context),
        payload: metadata,
      });
      return { id: result.id };
    },
    async createEtypeClassification({ entityId, etypeClassId, context }) {
      const result = await createEtypeClassification({
        context: toWorkspaceContext(context),
        payload: {
          authorized_public: true,
          entity_id: entityId,
          etype_class_id: etypeClassId,
        },
      });
      return { id: result.id };
    },
    async uploadAsset({ entityId, file, context }) {
      const result = await createAsset({
        entityId,
        entityType: EntityTypeDict.ElectricalCellRecording,
        fileName: file.name || '',
        mimeType: 'application/nwb',
        label: AssetLabel.nwb,
        payload: file,
        ctx: toWorkspaceContext(context),
      });
      return { id: result.id };
    },
  };
}
