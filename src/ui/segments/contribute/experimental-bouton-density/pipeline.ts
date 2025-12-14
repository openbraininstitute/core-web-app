// pipeline.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compact, get } from 'es-toolkit/compat';

import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS } from '@/ui/segments/contribute/experimental-bouton-density/config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import {
  createExperimentalBoutonDensity,
  measurementSchema,
} from '@/api/entitycore/queries/experimental/bouton-density';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExperimentalBoutonDensityForm } from '@/ui/segments/contribute/experimental-bouton-density/schema';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
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
      console.log('Form Measurements:', values.measurements);
      const measurements =
        compact(
          values.measurements.map((m, index) => {
            console.log(`Parsing measurement ${index}:`, m);

            // FIX: Explicitly set the 'unit' using the hardcoded string literal 'per_micrometer'.
            // This ensures all fully filled measurements are correctly transformed for the API payload.
            const measurementWithUnit = {
              name: m.name,
              value: m.value,
              unit: '1/μm', // Hardcoded string value for MeasurementUnit.PER_MICROMETER
            };

            const d = measurementSchema.safeParse(measurementWithUnit);
            console.log(`Parse result ${index}:`, d);
            if (d.success) return d.data;
            if (!d.success) {
              // This console.error is helpful for debugging if name/value are missing
              console.error(`Measurement ${index} failed validation:`, d.error);
            }
            return null;
          })
        ) ?? [];
      console.log('Final Payload Measurements:', measurements);

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

      console.log('Creating entity with payload:', payload);

      return createExperimentalBoutonDensity({
        context: { projectId, virtualLabId },
        payload,
      });
    },
    onSuccess: (data) => {
      console.log('Entity created successfully:', data);
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
      console.log('Creating contributions for entity:', entityId);
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
    onSuccess: (data) => {
      console.log('Contributions created successfully:', data);
    },
  });

  const createMtypeClassificationAsync = useMutation({
    mutationFn: ({
      entityId,
      mtype_class_id,
    }: {
      entityId: string;
      mtype_class_id: string;
    }) => {
      console.log('Creating M-type classification for entity:', entityId);
      return createMtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          entity_id: entityId,
          mtype_class_id: mtype_class_id,
          authorized_public:true
        },
      });
    },
    onSuccess: (data) => {
      console.log('M-type classification created successfully:', data);
    },
  });


  async function createEntity({ values }: { values: TExperimentalBoutonDensityForm }): Promise<string> {
    const experimentalBoutonDensity = await createExperimentalBoutonDensityAsync.mutateAsync(values);
    console.log('Entity created, ID:', experimentalBoutonDensity.id);

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

    console.log('Returning entity ID:', experimentalBoutonDensity.id);
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