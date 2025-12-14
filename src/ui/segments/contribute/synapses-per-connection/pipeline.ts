// pipeline.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compact, get } from 'es-toolkit/compat';

import { EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS } from '@/ui/segments/contribute/synapses-per-connection/config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import {
  createExperimentalSynapsesPerConnection,
  measurementSchema,
} from '@/api/entitycore/queries/experimental/synapses-per-connection';
// NOTE: The import for MeasurementUnit has been intentionally removed as it was failing to resolve at runtime.
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExperimentalSynapsesPerConnectionForm } from '@/ui/segments/contribute/synapses-per-connection/schema';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useExperimentalSynapsesPerConnectionPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TExperimentalSynapsesPerConnectionForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const createExperimentalSynapsesPerConnectionAsync = useMutation({
    mutationFn: (values: TExperimentalSynapsesPerConnectionForm) => {
      console.log('Form Measurements:', values.measurements);
      const measurements =
        compact(
          values.measurements.map((m, index) => {
            console.log(`Parsing measurement ${index}:`, m);

            // FIX: Explicitly set the 'unit' using the hardcoded string literal 'DIMENSIONLESS'.
            // This bypasses the runtime failure of the MeasurementUnit enum import, ensuring the unit is a string.
            const measurementWithUnit = {
              name: m.name,
              value: m.value,
              unit: 'dimensionless', // Hardcoded to satisfy Zod's z.literal() check
            };

            const d = measurementSchema.safeParse(measurementWithUnit);
            console.log(`Parse result ${index}:`, d);
            if (d.success) return d.data;
            if (!d.success) {
              console.error(`Measurement ${index} failed validation:`, d.error);
            }
            return null;
          })
        ) ?? [];
      console.log('Final Payload Measurements:', measurements);

      const payload = {
        name: values.name,
        description: values.description,
        brain_region_id: values.brain_region_id,
        pre_region_id: values.pre_region_id,
        post_region_id: values.post_region_id,
        pre_mtype_id: values.pre_mtype_id,
        post_mtype_id: values.post_mtype_id,
        subject_id: values.subject_id,
        license_id: values.license_id,
        measurements,
        legacy_id: null,
      };

      console.log('Creating entity with payload:', payload);

      return createExperimentalSynapsesPerConnection({
        context: { projectId, virtualLabId },
        payload,
      });
    },
    onSuccess: (data) => {
      console.log('Entity created successfully:', data);
      console.log('Entity ID:', data.id);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              query.queryKey.at(0) ===
              `data-entity-count-${ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection}`
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              get(
                (query.queryKey as ExtendedEntityTypeQueryKey)[0],
                'context.extendedEntityType'
              ) === ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection
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
      contribution: TExperimentalSynapsesPerConnectionForm['contribution'];
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


  async function createEntity({ values }: { values: TExperimentalSynapsesPerConnectionForm }): Promise<string> {
    const experimentalSynapsesPerConnection = await createExperimentalSynapsesPerConnectionAsync.mutateAsync(values);
    console.log('Entity created, ID:', experimentalSynapsesPerConnection.id);

    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: experimentalSynapsesPerConnection.id,
        contribution: values.contribution,
      }),
    ]);

    console.log('Returning entity ID:', experimentalSynapsesPerConnection.id);
    return experimentalSynapsesPerConnection.id;
  }

  const loading =
    createExperimentalSynapsesPerConnectionAsync.isPending || createContributionAsync.isPending;

  const error = createExperimentalSynapsesPerConnectionAsync.error || createContributionAsync.error;

  const status = {
    createExperimentalSynapsesPerConnection: createExperimentalSynapsesPerConnectionAsync.status,
    createContribution: createContributionAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
    mutationKeys: EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS.reduce(
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