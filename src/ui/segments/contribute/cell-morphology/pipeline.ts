'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get, isNil } from 'es-toolkit/compat';

import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createAndRegisterMorphometrics } from '@/api/one/cell-morphology';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CELL_MORPHOLOGY_PROGRESS_STEPS } from '@/ui/segments/contribute/cell-morphology/config';
import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useCellMorphologyPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TCellMorphologyForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const createCellMorphologyAsync = useMutation({
    mutationFn: async (values: TCellMorphologyForm) => {
      // 1. Identify the file to upload from the assets object
      const assetKeys = Object.keys(values.assets);
      const fileAsset = assetKeys.length > 0 ? values.assets[assetKeys[0]] : null;

      if (!fileAsset) {
        throw new Error('No morphology file provided in assets.');
      }

      // 2. Build the payload currently used in the existing logic
      const location =
        values.setup.location &&
        !isNil(values.setup.location.x) &&
        !isNil(values.setup.location.y) &&
        !isNil(values.setup.location.z)
          ? {
              x: values.setup.location.x,
              y: values.setup.location.y,
              z: values.setup.location.z,
            }
          : null;

      const payload = {
        name: values.setup.name,
        description: values.setup.description,
        brain_region_id: values.setup.brain_region_id,
        cell_morphology_protocol_id: values.cell_morphology_protocol_id,
        subject_id: values.subject_id,
        license_id: values.license_id,
        experiment_date: values.setup.experiment_date as string,
        contact_email: values.setup.contact_email,
        published_in: values.setup.published_in,
        location,
        project_id: projectId, // Including context as part of the registration payload
        virtual_lab_id: virtualLabId,
      };

      // 3. Execute the new registration function
      const result = await createAndRegisterMorphometrics(fileAsset, payload, {
        projectId,
        virtualLabId,
      });

      if (!result.isValid) {
        throw new Error('Failed to register morphology with metrics.');
      }

      // Return the ID to maintain compatibility with downstream mutations
      return { id: result.id };
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              query.queryKey.at(0) ===
              `data-entity-count-${ExtendedEntitiesTypeDict.CellMorphology}`
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              get(
                (query.queryKey as ExtendedEntityTypeQueryKey)[0],
                'context.extendedEntityType'
              ) === ExtendedEntitiesTypeDict.CellMorphology
            );
          },
        }),
      ]);
    },
  });

  const createContributionAsync = useMutation({
    mutationFn: ({
      entityId,
      contribution,
    }: {
      entityId: string;
      contribution: TCellMorphologyForm['contribution'];
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
    mutationFn: ({
      entityId,
      mtype_class_id,
    }: {
      entityId: string;
      mtype_class_id: TCellMorphologyForm['mtype_class_id'];
    }) => {
      return createMtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          authorized_public: true,
          entity_id: entityId,
          mtype_class_id,
        },
      });
    },
  });

  async function createEntity({ values }: { values: TCellMorphologyForm }): Promise<string> {
    const cellMorphology = await createCellMorphologyAsync.mutateAsync(values);
    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: cellMorphology.id,
        contribution: values.contribution,
      }),
      createMtypeClassificationAsync.mutateAsync({
        entityId: cellMorphology.id,
        mtype_class_id: values.mtype_class_id,
      }),
    ]);
    return cellMorphology.id;
  }

  const loading =
    createCellMorphologyAsync.isPending ||
    createContributionAsync.isPending ||
    createMtypeClassificationAsync.isPending;

  const error =
    createCellMorphologyAsync.error ||
    createContributionAsync.error ||
    createMtypeClassificationAsync.error;

  const status = {
    createCellMorphology: createCellMorphologyAsync.status,
    createContribution: createContributionAsync.status,
    createMtypeClassification: createMtypeClassificationAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
    mutationKeys: CELL_MORPHOLOGY_PROGRESS_STEPS.reduce(
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
