// pipeline.ts

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compact, get } from 'es-toolkit/compat';

import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createEtypeClassification } from '@/api/entitycore/queries/annotations/etype-classification';
import { EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS } from '@/ui/segments/contribute/experimental-neuron-density/config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import {
  createExperimentalNeuronDensity,
  measurementSchema,
} from '@/api/entitycore/queries/experimental/neuron-density';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExperimentalNeuronDensityForm } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useExperimentalNeuronDensityPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TExperimentalNeuronDensityForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const createExperimentalNeuronDensityAsync = useMutation({
    mutationFn: (values: TExperimentalNeuronDensityForm) => {
      const measurements =
        compact(
          values.measurements.map((m) => {
            // FIX: Explicitly set the 'unit' to the required string literal '1/mm3'
            const measurementWithUnit = {
              name: m.name,
              value: m.value,
              unit: '1/mm³', // Hardcoded string value for the unit
            };

            const d = measurementSchema.safeParse(measurementWithUnit);
            if (d.success) return d.data;
            return null;
          })
        ) ?? [];
      return createExperimentalNeuronDensity({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          brain_region_id: values.setup.brain_region_id,
          subject_id: values.subject_id,
          license_id: values.license_id,
          measurements,
          legacy_id: null,
        },
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              query.queryKey.at(0) ===
              `data-entity-count-${ExtendedEntitiesTypeDict.ExperimentalNeuronDensity}`
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              get(
                (query.queryKey as ExtendedEntityTypeQueryKey)[0],
                'context.extendedEntityType'
              ) === ExtendedEntitiesTypeDict.ExperimentalNeuronDensity
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
      contribution: TExperimentalNeuronDensityForm['contribution'];
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

  const createEtypeClassificationAsync = useMutation({
    mutationKey: ['createEtypeClassification', sessionId],
    mutationFn: ({ entityId, etype_class_id }: { entityId: string; etype_class_id: string }) => {
      return createEtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          authorized_public: true,
          entity_id: entityId,
          etype_class_id,
        },
      });
    },
  });

  const createMtypeClassificationAsync = useMutation({
    mutationKey: ['createMtypeClassification', sessionId],
    mutationFn: ({ entityId, mtype_class_id }: { entityId: string; mtype_class_id: string }) => {
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

  async function createEntity({
    values,
  }: {
    values: TExperimentalNeuronDensityForm;
  }): Promise<string> {
    const experimentalNeuronDensity =
      await createExperimentalNeuronDensityAsync.mutateAsync(values);

    const classificationPromises: Array<Promise<any>> = [
      // Contribution is always required
      createContributionAsync.mutateAsync({
        entityId: experimentalNeuronDensity.id,
        contribution: values.contribution,
      }),
    ];

    // Track which optional steps are being skipped
    const willSkipEtype = !values.etype_class_id || values.etype_class_id === '';
    const willSkipMtype = !values.mtype_class_id || values.mtype_class_id === '';

    if (willSkipEtype) {
      createEtypeClassificationAsync.reset();
    } else {
      classificationPromises.push(
        createEtypeClassificationAsync.mutateAsync({
          entityId: experimentalNeuronDensity.id,
          etype_class_id: values.etype_class_id!,
        })
      );
    }

    if (willSkipMtype) {
      createMtypeClassificationAsync.reset();
    } else {
      classificationPromises.push(
        createMtypeClassificationAsync.mutateAsync({
          entityId: experimentalNeuronDensity.id,
          mtype_class_id: values.mtype_class_id!, // Non-null assertion since we checked above
        })
      );
    }

    const results = await Promise.all(classificationPromises);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        throw new Error('One or more classifications failed');
      }
    });

    return experimentalNeuronDensity.id;
  }

  const loading =
    createExperimentalNeuronDensityAsync.isPending ||
    createContributionAsync.isPending ||
    createEtypeClassificationAsync.isPending ||
    createMtypeClassificationAsync.isPending;

  const error =
    createExperimentalNeuronDensityAsync.error ||
    createContributionAsync.error ||
    createEtypeClassificationAsync.error ||
    createMtypeClassificationAsync.error;

  const status = {
    createExperimentalNeuronDensity: createExperimentalNeuronDensityAsync.status,
    createContribution: createContributionAsync.status,
    createEtypeClassification:
      createEtypeClassificationAsync.status === 'idle'
        ? 'success'
        : createEtypeClassificationAsync.status,
    createMtypeClassification:
      createMtypeClassificationAsync.status === 'idle'
        ? 'success'
        : createMtypeClassificationAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
    mutationKeys: EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS.reduce(
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
