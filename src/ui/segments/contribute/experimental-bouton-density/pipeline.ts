// pipeline.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compact, get } from 'es-toolkit/compat';
import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createExperimentalBoutonDensity } from '@/api/entitycore/queries/experimental/bouton-density';
import { measurementSchema } from '@/api/entitycore/queries/experimental/neuron-density';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { MeasurementUnit } from '@/api/entitycore/types/shared/global';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS } from '@/ui/segments/contribute/experimental-bouton-density/config';

import type { TExperimentalBoutonDensityForm } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useExperimentalBoutonDensityPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TExperimentalBoutonDensityForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const createExperimentalBoutonDensityAsync = useMutation({
    mutationFn: (values: TExperimentalBoutonDensityForm) => {
      const measurements =
        compact(
          values.measurements.map((m) => {
            const measurementWithUnit = {
              name: m.name,
              value: m.value,
              unit: MeasurementUnit.linear_density__1_um,
            };

            const d = measurementSchema.safeParse(measurementWithUnit);

            if (d.success) return d.data;

            return null;
          })
        ) ?? [];

      const payload = {
        name: values.setup.name,
        description: values.setup.description,
        brain_region_id: values.setup.brain_region_id,
        subject_id: values.subject_id,
        license_id: values.license_id,
        mtype_class_id: values.mtype_class_id,
        measurements,
        legacy_id: null,
      };

      return createExperimentalBoutonDensity({
        context: { projectId, virtualLabId },
        payload,
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              query.queryKey.at(0) ===
              `data-entity-count-${ExtendedEntitiesTypeDict.ExperimentalBoutonDensity}`
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              get(
                (query.queryKey as ExtendedEntityTypeQueryKey)[0],
                'context.extendedEntityType'
              ) === ExtendedEntitiesTypeDict.ExperimentalBoutonDensity
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
      contribution: TExperimentalBoutonDensityForm['contribution'];
    }) => {
      return Promise.all(
        contribution
          .filter((c) => {
            return c.agent_id && c.role_id && ContributionSchema.safeParse(c).success;
          })
          .map((c) =>
            createContribution({
              context: { virtualLabId, projectId },
              contributor: {
                agent_id: c.agent_id as string,
                role_id: c.role_id as string,
                entity_id: entityId,
              },
            })
          )
      );
    },
  });

  const createMtypeClassificationAsync = useMutation({
    mutationFn: ({ entityId, mtype_class_id }: { entityId: string; mtype_class_id: string }) => {
      return createMtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          entity_id: entityId,
          mtype_class_id,
          authorized_public: true,
        },
      });
    },
  });

  async function createEntity({
    values,
  }: {
    values: TExperimentalBoutonDensityForm;
  }): Promise<string> {
    const experimentalBoutonDensity =
      await createExperimentalBoutonDensityAsync.mutateAsync(values);

    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: experimentalBoutonDensity.id,
        contribution: values.contribution,
      }),
      createMtypeClassificationAsync.mutateAsync({
        entityId: experimentalBoutonDensity.id,
        mtype_class_id: values.mtype_class_id,
      }),
    ]);

    return experimentalBoutonDensity.id;
  }

  const loading =
    createExperimentalBoutonDensityAsync.isPending || createContributionAsync.isPending;

  const error = createExperimentalBoutonDensityAsync.error || createContributionAsync.error;

  const status = {
    createExperimentalBoutonDensity: createExperimentalBoutonDensityAsync.status,
    createContribution: createContributionAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
    mutationKeys: EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS.reduce(
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
