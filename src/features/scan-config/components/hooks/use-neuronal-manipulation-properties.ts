'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchNeuronalManipulationProperties } from '@/api/one/neuronal-manipulation-properties';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { WorkspaceContext } from '@/types/common';

const STALE_TIME_MS = 60 * 60 * 1000; // 1 hour

export type TUseNeuronalManipulationPropertiesParams = {
  workspace: WorkspaceContext;
  /** circuit entity id the manipulation targets */
  entityId: string | undefined;
  /** schema `property_endpoints.NeuronalManipulation` */
  endpoint: string | undefined;
  /** resolved neuron-set block config; null (default target) when none is selected */
  neuronSet: unknown;
  /** extra gate */
  enabled?: boolean;
};

/**
 * loads the mechanism variables available for a circuit neuronal manipulation,
 * scoped to the selected neuron set.
 * runs once an entity id and endpoint are known; an unselected neuron set is sent to the endpoint as null (the default target).
 */
export function useNeuronalManipulationProperties({
  workspace,
  entityId,
  endpoint,
  neuronSet,
  enabled = true,
}: TUseNeuronalManipulationPropertiesParams) {
  return useQuery({
    queryKey: ['neuronal-manipulation-properties', { workspace, entityId, endpoint, neuronSet }],
    queryFn: ({ signal }) =>
      fetchNeuronalManipulationProperties({
        ctx: workspace,
        endpoint: endpoint as string,
        entityId: entityId as string,
        neuronSet,
        signal,
      }),
    enabled: enabled && !!entityId && !!endpoint,
    refetchOnWindowFocus: false,
    staleTime: STALE_TIME_MS,
    select: (resp): MechanismVariablesRoot =>
      (resp.mechanism_variables_by_ion_channel as MechanismVariablesRoot | undefined) ?? {},
  });
}
