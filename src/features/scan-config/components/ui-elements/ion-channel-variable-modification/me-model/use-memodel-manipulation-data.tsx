'use client';

import { getObiOneErrorReason, toObiOneErrorBody } from '@/api/one/utils';
import { useNeuronalManipulationProperties } from '@/features/scan-config/components/hooks/use-neuronal-manipulation-properties';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ReactNode } from 'react';
import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

const NO_VARIABLES_MESSAGE = 'No ion-channel variables are available for this model.';
const ERROR_MESSAGE = 'Could not load ion-channel variables for this model.';

/** Parameters for {@link useMeModelManipulationData}. */
export type TUseMeModelManipulationDataParams = {
  /** Schema `property_endpoints.NeuronalManipulation` path. */
  endpoint: string | undefined;
  /** Target MEModel entity id. */
  entityId: string | undefined;
};

/** Data and gating state for MEModel neuronal-manipulation UI. */
export type TMeModelManipulationData = {
  data: MechanismVariablesRoot | null;
  loading: boolean;
  /** Status note for the picker (error / empty); `null` when usable. */
  reason: ReactNode | null;
};

/**
 * Fetches MEModel mechanism variables and derives picker gating state.
 *
 * @param params - Endpoint path and MEModel entity id.
 * @returns Mechanism variables, loading flag, and optional status reason.
 */
export function useMeModelManipulationData({
  endpoint,
  entityId,
}: TUseMeModelManipulationDataParams): TMeModelManipulationData {
  const workspace = useWorkspace();

  const { data, isLoading, isError, error } = useNeuronalManipulationProperties({
    workspace,
    entityId,
    endpoint,
  });

  let reason: ReactNode | null = null;
  if (isError) {
    const body = toObiOneErrorBody(error);
    const endpointMessage = body ? getObiOneErrorReason(body) : null;
    reason = (
      <div className="flex flex-col gap-1">
        <span className="text-error font-medium">{ERROR_MESSAGE}</span>
        {endpointMessage && endpointMessage !== 'Unknown error' && (
          <span className="text-gray-400">{endpointMessage}</span>
        )}
      </div>
    );
  } else if (!isLoading && data && Object.keys(data).length === 0) {
    reason = NO_VARIABLES_MESSAGE;
  }

  return {
    data: data ?? null,
    loading: isLoading,
    reason,
  };
}
