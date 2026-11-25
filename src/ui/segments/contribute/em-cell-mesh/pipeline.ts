'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createEMCellMesh, deleteEMCellMesh } from '@/api/entitycore/queries';
import {
  createMtypeClassification,
  type TMtypeClassificationCreate,
} from '@/api/entitycore/queries/annotations/mtype-classification';
import { createAsset } from '@/api/entitycore/queries/assets';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import { convertEMCellMesh } from '@/api/one/em-cell-mesh';
import { tryCatch } from '@/api/utils';
import { invalidateEntityListings } from '@/features/data-grid/listing-queries';
import { messages } from '@/i18n/en/upload';
import { useWarnBeforeUnload } from '@/ui/hooks/use-warn-before-unload';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  CONVERSION_MUTATION_KEY,
  EM_CELL_MESH_PROGRESS_STEPS,
} from '@/ui/segments/contribute/em-cell-mesh/config';
import {
  describeUploadProgress,
  isObjMeshFile,
  isSameUploadStep,
  toEMCellMeshCreatePayload,
  uploadFraction,
} from '@/ui/segments/contribute/em-cell-mesh/helpers';
import {
  getEMCellMeshMimeType,
  type TEMCellMeshForm,
} from '@/ui/segments/contribute/em-cell-mesh/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';

import type { IUploadProgress } from '@/api/entitycore/queries/assets/multipart';
import type { TEntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useEMCellMeshPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TEMCellMeshForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();
  const [uploadProgress, setUploadProgress] = useState<IUploadProgress | null>(null);
  const [isObjSubmission, setIsObjSubmission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createEMCellMeshAsync = useMutation({
    mutationFn: ({
      values,
      lifecycleStatus,
    }: {
      values: TEMCellMeshForm;
      lifecycleStatus: TEntityLifecycleStatus;
    }) =>
      createEMCellMesh({
        context: { projectId, virtualLabId },
        payload: toEMCellMeshCreatePayload(values, lifecycleStatus),
      }),
    onSettled: () => invalidateEntityListings(queryClient, ExtendedEntitiesTypeDict.EMCellMesh),
  });

  const createAssetsAsync = useMutation({
    mutationFn: async ({ entityId, file }: { entityId: string; file: File }) => {
      return createAsset({
        ctx: { projectId, virtualLabId },
        entityType: ExtendedEntitiesTypeDict.EMCellMesh,
        entityId,
        fileName: file.name,
        mimeType: getEMCellMeshMimeType(file) ?? file.type,
        payload: file,
        label: 'cell_surface_mesh' as Parameters<typeof createAsset>[0]['label'],
        onProgress: (progress: IUploadProgress) =>
          setUploadProgress((shown) => (isSameUploadStep(shown, progress) ? shown : progress)),
      });
    },
  });

  const createContributionAsync = useMutation({
    mutationFn: ({
      entityId,
      contribution,
    }: {
      entityId: string;
      contribution: TEMCellMeshForm['contribution'];
    }) => {
      return Promise.all(
        contribution
          .filter((c) => ContributionSchema.safeParse(c).success)
          .map((c) =>
            createContribution({
              context: { virtualLabId, projectId },
              contributor: {
                agent_id: c.agent_id!,
                role_id: c.role_id!,
                entity_id: entityId,
              },
            })
          )
      );
    },
  });

  const createMtypeClassificationAsync = useMutation({
    mutationFn: async ({ entityId, mtypeId }: { entityId: string; mtypeId: string }) => {
      const payload: TMtypeClassificationCreate = {
        mtype_class_id: mtypeId,
        entity_id: entityId,
        authorized_public: true,
      };

      return createMtypeClassification({
        context: { projectId, virtualLabId },
        payload,
      });
    },
  });

  const convertAsync = useMutation({
    mutationFn: (entityId: string) =>
      convertEMCellMesh({ ctx: { projectId, virtualLabId }, entityId }),
  });

  useWarnBeforeUnload(submitting);

  const submit = async (values: TEMCellMeshForm) => {
    const file = values.assets?.mesh;
    const isObj = file ? isObjMeshFile(file) : false;
    setIsObjSubmission(isObj);
    setUploadProgress(null);

    const cellMesh = await createEMCellMeshAsync.mutateAsync({
      values,
      lifecycleStatus: isObj ? EntityLifecycleStatus.Draft : EntityLifecycleStatus.Active,
    });

    try {
      if (values.contribution && values.contribution.length > 0) {
        await createContributionAsync.mutateAsync({
          entityId: cellMesh.id,
          contribution: values.contribution,
        });
      }

      if (values.mtype_class_id) {
        await createMtypeClassificationAsync.mutateAsync({
          entityId: cellMesh.id,
          mtypeId: values.mtype_class_id,
        });
      }

      if (file) {
        await createAssetsAsync.mutateAsync({ entityId: cellMesh.id, file });
      }

      if (isObj) {
        await convertAsync.mutateAsync(cellMesh.id);
      }
    } catch (error) {
      await tryCatch(deleteEMCellMesh({ id: cellMesh.id, context: { projectId, virtualLabId } }));
      invalidateEntityListings(queryClient, ExtendedEntitiesTypeDict.EMCellMesh);
      throw error;
    }

    return cellMesh;
  };

  return {
    createEntity: async ({ values }: { values: TEMCellMeshForm }) => {
      setSubmitting(true);
      return submit(values).finally(() => setSubmitting(false));
    },
    loading: submitting,
    error: (createEMCellMeshAsync.error ||
      createAssetsAsync.error ||
      createContributionAsync.error ||
      createMtypeClassificationAsync.error ||
      convertAsync.error) as Error | null,
    status: {
      createEMCellMesh: createEMCellMeshAsync.status,
      createEMCellMeshAssets: createAssetsAsync.status,
      createContribution: createContributionAsync.status,
      createMtypeClassification: createMtypeClassificationAsync.status,
      [CONVERSION_MUTATION_KEY]: convertAsync.status,
    },
    stepProgress: uploadProgress
      ? {
          createEMCellMeshAssets: {
            detail: describeUploadProgress(uploadProgress),
            fraction: uploadFraction(uploadProgress),
          },
        }
      : undefined,
    skippedSteps: isObjSubmission ? [] : [CONVERSION_MUTATION_KEY],
    completionNotice:
      isObjSubmission && convertAsync.isSuccess ? messages.MeshConversionStarted : null,
    mutationKeys: EM_CELL_MESH_PROGRESS_STEPS.reduce(
      (acc, step) => {
        acc[step.mutationKey] = {
          key: [step.mutationKey, sessionId],
          label: step.label,
        };
        return acc;
      },
      {} as Record<string, IMutationKeyConfig>
    ),
  };
}
