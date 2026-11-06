'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchNeuronalManipulationProperties,
  type TNeuronalManipulationPropertiesResponse,
} from '@/api/one/neuronal-manipulation-properties';
import {
  type MechanismVariablesRoot,
  RootSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

import type { WorkspaceContext } from '@/types/common';

const STALE_TIME_MS = 60 * 60 * 1000;

/** Parameters for {@link useNeuronalManipulationProperties}. */
export type TUseNeuronalManipulationPropertiesParams = {
  workspace: WorkspaceContext;
  /** Target MEModel or Circuit entity id. */
  entityId: string | undefined;
  /** Schema `property_endpoints.NeuronalManipulation` path. */
  endpoint: string | undefined;
  /**
   * Circuit-only resolved neuron-set config (`null` = default target).
   * Omit for MEModel fetches.
   */
  neuronSet?: unknown;
  /** When `true`, include `neuron_set` in the POST body (Circuit endpoint). */
  includeNeuronSet?: boolean;
  /** Additional enable gate for the query. */
  enabled?: boolean;
};

/**
 * Selects the mechanism-variables map from a neuronal-manipulation properties response.
 *
 * @param resp - Raw endpoint response.
 * @returns PascalCase `MechanismVariablesByIonChannel` when present; otherwise legacy snake_case; otherwise `{}`.
 */
export function selectMechanismVariablesRoot(
  resp: TNeuronalManipulationPropertiesResponse
): MechanismVariablesRoot {
  const root = resp[RootSelector] ?? resp.mechanism_variables_by_ion_channel ?? undefined;
  return (root as MechanismVariablesRoot | undefined) ?? {};
}

/** Mechanism variables plus the endpoint's warnings (e.g. why the variables are empty). */
export type TNeuronalManipulationProperties = {
  variables: MechanismVariablesRoot;
  warnings: string[];
};

/**
 * Selects the variables and the string warnings from a neuronal-manipulation properties response.
 *
 * @param resp - Raw endpoint response.
 * @returns The mechanism-variables map and the warnings (`[]` when absent or not a list).
 */
export function selectNeuronalManipulationProperties(
  resp: TNeuronalManipulationPropertiesResponse
): TNeuronalManipulationProperties {
  const warnings = Array.isArray(resp.warnings)
    ? resp.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];
  return { variables: selectMechanismVariablesRoot(resp), warnings };
}

/**
 * Loads mechanism variables for neuronal manipulation blocks.
 *
 * Circuit callers should pass `includeNeuronSet: true` and a resolved `neuronSet`
 * (including `null` for the default target). MEModel callers omit both.
 *
 * @param params - Workspace, entity, endpoint, and optional neuron-set scope.
 * @returns React Query result with selected {@link TNeuronalManipulationProperties}.
 */
export function useNeuronalManipulationProperties({
  workspace,
  entityId,
  endpoint,
  neuronSet,
  includeNeuronSet = false,
  enabled = true,
}: TUseNeuronalManipulationPropertiesParams) {
  return useQuery({
    queryKey: [
      'neuronal-manipulation-properties',
      { workspace, entityId, endpoint, neuronSet, includeNeuronSet },
    ],
    queryFn: ({ signal }) =>
      fetchNeuronalManipulationProperties({
        ctx: workspace,
        endpoint: endpoint as string,
        entityId: entityId as string,
        neuronSet,
        includeNeuronSet,
        signal,
      }),
    enabled: enabled && !!entityId && !!endpoint,
    refetchOnWindowFocus: false,
    staleTime: STALE_TIME_MS,
    select: selectNeuronalManipulationProperties,
  });
}
