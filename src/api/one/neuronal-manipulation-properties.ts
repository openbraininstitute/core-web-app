import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

/**
 * `POST /declared/neuronal-manipulation-properties`.
 *
 * the mechanism-variables payload is keyed `MechanismVariablesByIonChannel`
 * (same as the schema `property` selector / `RootSelector`). Older backends
 * may still emit snake_case; callers should prefer PascalCase and fall back.
 */
export type TNeuronalManipulationPropertiesResponse = {
  entity_type?: string;
  population?: string;
  populations?: string[] | null;
  MechanismVariablesByIonChannel?: Record<string, unknown>;
  /** @deprecated prefer `MechanismVariablesByIonChannel` */
  mechanism_variables_by_ion_channel?: Record<string, unknown>;
  warnings?: unknown;
};

export type TFetchNeuronalManipulationPropertiesParams = {
  ctx: WorkspaceContext;
  /** schema `property_endpoints.NeuronalManipulation`  */
  endpoint: string;
  /** circuit entity id the manipulation targets */
  entityId: string;
  /** resolved neuron-set block config (a `NeuronSetUnion`), not a reference */
  neuronSet: unknown;
  signal?: AbortSignal;
};

/**
 * fetches the ion-channel mechanism variables available for a circuit neuronal
 * manipulation, scoped to the selected neuron set (intersection across the emodels
 * in that set, computed server-side).
 */
export async function fetchNeuronalManipulationProperties({
  ctx,
  endpoint,
  entityId,
  neuronSet,
  signal,
}: TFetchNeuronalManipulationPropertiesParams): Promise<TNeuronalManipulationPropertiesResponse> {
  const api = await obioneApi();

  return api.post<TNeuronalManipulationPropertiesResponse>(`/declared${endpoint}`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      entity_id: entityId,
      neuron_set: neuronSet ?? null,
    },
    signal,
  });
}
