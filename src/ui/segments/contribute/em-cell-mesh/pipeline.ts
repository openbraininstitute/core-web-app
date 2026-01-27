'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import { createEMCellMesh } from '@/api/entitycore/queries';
import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createAsset } from '@/api/entitycore/queries/assets';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EM_CELL_MESH_PROGRESS_STEPS } from '@/ui/segments/contribute/em-cell-mesh/config';
import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
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

  // STEP 1: Create Metadata Entity
  const createEMCellMeshAsync = useMutation({
    mutationFn: (values: TEMCellMeshForm) => {
      // We explicitly pick fields to avoid passing File objects or
      // complex React state into the API call which causes circular refs.
      return createEMCellMesh({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          brain_region_id: values.setup.brain_region_id,
          subject_id: values.subject_id,
          license_id: values.license_id,
          // Format date if it's a Dayjs object from Ant Design
          experiment_date:
            (values.setup.experiment_date as any)?.toISOString?.() || values.setup.experiment_date,
          contact_email: values.setup.contact_email,
          published_in: values.setup.published_in,
          notice_text: values.setup.notice_text,
          em_dense_reconstruction_dataset_id: values.setup.em_dense_reconstruction_dataset_id,
          release_version: values.setup.release_version,
          dense_reconstruction_cell_id: values.setup.dense_reconstruction_cell_id,
          generation_method: values.setup.generation_method,
          level_of_detail: values.setup.level_of_detail,
          mesh_type: values.setup.mesh_type,
          generation_parameters: values.setup.generation_parameters,
        },
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === `data-entity-count-${ExtendedEntitiesTypeDict.EMCellMesh}`,
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            get((query.queryKey as ExtendedEntityTypeQueryKey)[0], 'context.extendedEntityType') ===
            ExtendedEntitiesTypeDict.EMCellMesh,
        }),
      ]);
    },
  });

  // STEP 2: Upload Assets (The OBJ file)
  const createAssetsAsync = useMutation({
    mutationFn: async ({ entityId, file }: { entityId: string; file: File }) => {
      return createAsset({
        ctx: { projectId, virtualLabId },
        entityType: ExtendedEntitiesTypeDict.EMCellMesh,
        entityId,
        fileName: file.name,
        mimeType: 'application/obj',
        payload: file,
        label: 'cell_surface_mesh' as any,
      });
    },
  });

  // STEP 3: Create Contributions (Authors/Contributors)
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

  // STEP 4: Create M-Type Annotation
  const createMtypeClassificationAsync = useMutation({
    mutationFn: async ({ entityId, mtypeId }: { entityId: string; mtypeId: string }) => {
      return createMtypeClassification({
        context: { projectId, virtualLabId },
        entityId, // Used for the URL path
        payload: {
          // FIX: The backend requires these specific keys in the request body
          mtype_class_id: mtypeId,
          entity_id: entityId,
          authorized_public: true,
        } as any,
      });
    },
  });

  return {
    createEntity: async ({ values }: { values: TEMCellMeshForm }) => {
      // 1. Create the base entity
      const cellMorphology = await createEMCellMeshAsync.mutateAsync(values);

      // 2. Upload the OBJ file if it exists
      if (values.assets?.obj) {
        await createAssetsAsync.mutateAsync({
          entityId: cellMorphology.id,
          file: values.assets.obj,
        });
      }

      // 3. Create contributions
      if (values.contribution && values.contribution.length > 0) {
        await createContributionAsync.mutateAsync({
          entityId: cellMorphology.id,
          contribution: values.contribution,
        });
      }

      // 4. Create M-Type classification
      if (values.mtype_class_id) {
        await createMtypeClassificationAsync.mutateAsync({
          entityId: cellMorphology.id,
          mtypeId: values.mtype_class_id,
        });
      }

      return cellMorphology.id;
    },
    loading:
      createEMCellMeshAsync.isPending ||
      createAssetsAsync.isPending ||
      createContributionAsync.isPending ||
      createMtypeClassificationAsync.isPending,
    error:
      createEMCellMeshAsync.error ||
      createAssetsAsync.error ||
      createContributionAsync.error ||
      createMtypeClassificationAsync.error,
    status: {
      createEMCellMesh: createEMCellMeshAsync.status,
      createEMCellMeshAssets: createAssetsAsync.status,
      createContribution: createContributionAsync.status,
      createMtypeClassification: createMtypeClassificationAsync.status,
    },
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
  } as any;
}
