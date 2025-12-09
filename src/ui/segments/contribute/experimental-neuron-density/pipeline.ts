'use client';

import { useMutation } from '@tanstack/react-query';
import { compact } from 'es-toolkit/compat';

import { EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS } from '@/ui/segments/contribute/experimental-neuron-density/config';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import {
  createExperimentalNeuronDensity,
  measurementSchema,
} from '@/api/entitycore/queries/experimental/neuron-density';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExperimentalNeuronDensityForm } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useExperimentalNeuronDensityPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TExperimentalNeuronDensityForm> {
  const { projectId, virtualLabId } = useWorkspace();

  const createExperimentalNeuronDensityAsync = useMutation({
    mutationFn: (values: TExperimentalNeuronDensityForm) => {
      const measurements =
        compact(
          values.measurements.map((m) => {
            const d = measurementSchema.safeParse(m);
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

  async function createEntity({
    values,
  }: {
    values: TExperimentalNeuronDensityForm;
  }): Promise<string> {
    const experimentalNeuronDensity =
      await createExperimentalNeuronDensityAsync.mutateAsync(values);
    await createContributionAsync.mutateAsync({
      entityId: experimentalNeuronDensity.id,
      contribution: values.contribution,
    });
    return experimentalNeuronDensity.id;
  }

  const loading =
    createExperimentalNeuronDensityAsync.isPending || createContributionAsync.isPending;

  const error = createExperimentalNeuronDensityAsync.error || createContributionAsync.error;

  const status = {
    createExperimentalNeuronDensity: createExperimentalNeuronDensityAsync.status,
    createContribution: createContributionAsync.status,
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
