import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

/**
 * Response body for MEModel and Circuit neuronal-manipulation property endpoints.
 *
 * @property MechanismVariablesByIonChannel - Preferred mechanism-variables map key.
 * @property mechanism_variables_by_ion_channel - Legacy snake_case key; prefer PascalCase.
 */
export type TNeuronalManipulationPropertiesResponse = {
  entity_type?: string;
  population?: string;
  populations?: string[] | null;
  MechanismVariablesByIonChannel?: Record<string, unknown>;
  /** @deprecated Prefer `MechanismVariablesByIonChannel`. */
  mechanism_variables_by_ion_channel?: Record<string, unknown>;
  warnings?: unknown;
};

/** Parameters for {@link fetchNeuronalManipulationProperties}. */
export type TFetchNeuronalManipulationPropertiesParams = {
  ctx: WorkspaceContext;
  /**
   * Schema `property_endpoints.NeuronalManipulation` path without the `/declared` prefix.
   *
   * @example `/memodel-neuronal-manipulation-properties`
   * @example `/circuit-neuronal-manipulation-properties-by-neuron-set`
   */
  endpoint: string;
  /** Target MEModel or Circuit entity id. */
  entityId: string;
  /**
   * Resolved neuron-set config for Circuit requests (`null` = default target).
   * Omitted from the POST body when `includeNeuronSet` is false.
   */
  neuronSet?: unknown;
  /**
   * When `true`, include `neuron_set` in the POST body (Circuit endpoint).
   * Leave unset/false for MEModel requests.
   */
  includeNeuronSet?: boolean;
  signal?: AbortSignal;
};

/**
 * Fetches ion-channel mechanism variables for neuronal manipulation UI blocks.
 *
 * Posts to `/declared{endpoint}`:
 * - MEModel: `{ entity_id }`
 * - Circuit: `{ entity_id, neuron_set }` when `includeNeuronSet` is true
 *
 * @param params - Request context, endpoint, entity id, and optional neuron set.
 * @returns Mechanism variables keyed by ion channel (`MechanismVariablesByIonChannel`).
 */
export async function fetchNeuronalManipulationProperties({
  ctx,
  endpoint,
  entityId,
  neuronSet,
  includeNeuronSet = false,
  signal,
}: TFetchNeuronalManipulationPropertiesParams): Promise<TNeuronalManipulationPropertiesResponse> {
  const api = await obioneApi();

  const body: { entity_id: string; neuron_set?: unknown } = {
    entity_id: entityId,
  };
  if (includeNeuronSet) {
    body.neuron_set = neuronSet ?? null;
  }

  return api.post<TNeuronalManipulationPropertiesResponse>(`/declared${endpoint}`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    signal,
  });
}
