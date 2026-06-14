'use client';

import { get } from 'es-toolkit/compat';
import { type ReactNode, useEffect, useRef } from 'react';

import { useNeuronalManipulationProperties } from '@/features/scan-config/components/hooks/use-neuronal-manipulation-properties';
import { resolveNeuronSet } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/state';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { Config, ConfigValue } from '@/features/scan-config/types';

const NO_VARIABLES_MESSAGE = 'No ion-channel variables are available for the selected neuron set.';
const ERROR_MESSAGE = 'Could not load variables for the selected neuron set.';

/**
 * Pulls the human-readable message the endpoint returned (FastAPI `detail`, parsed onto
 * `ApiError.cause`) so it can be appended to the generic error note. Returns null when
 * there is no usable string to show.
 */
function extractEndpointErrorMessage(error: unknown): string | null {
  const message = get(error, 'cause.message') as unknown;
  if (typeof message === 'string' && message.trim()) return message.trim();

  const details = get(error, 'cause.details') as unknown;
  if (typeof details === 'string' && details.trim()) return details.trim();

  return null;
}

export type TUseCircuitManipulationDataParams = {
  config: Config;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  /** sibling block field holding the neuron-set reference (schema `property_source_field`) */
  sourceField: string;
  /** the modification field key being edited */
  fieldKey: string;
  endpoint: string | undefined;
  entityId: string | undefined;
};

export type TCircuitManipulationData = {
  data: MechanismVariablesRoot | null;
  loading: boolean;
  /** rendered status note shown in place of the picker (error / no variables); null when usable */
  reason: ReactNode | null;
};

/**
 * shared data layer for the circuit neuronal-manipulation components. resolves the
 * sibling neuron-set selection, fetches the matching mechanism variables, derives the
 * gating note, and resets the modification when the targeted neuron set changes
 */
export function useCircuitManipulationData({
  config,
  state,
  setState,
  sourceField,
  fieldKey,
  endpoint,
  entityId,
}: TUseCircuitManipulationDataParams): TCircuitManipulationData {
  const workspace = useWorkspace();
  const { signature: neuronSetSignature, value: neuronSet } = resolveNeuronSet(
    config,
    state[sourceField]
  );

  // reset the modification when the targeted neuron set changes: the available variables differ between sets,
  // so a previously-picked variable may no longer be valid.
  // a ref to the latest state keeps this off the effect deps so it fires only on an actual change
  const latestRef = useRef({ state, setState, fieldKey });
  latestRef.current = { state, setState, fieldKey };
  const previousTargetRef = useRef(neuronSetSignature);
  useEffect(() => {
    if (previousTargetRef.current === neuronSetSignature) return;
    previousTargetRef.current = neuronSetSignature;

    const { state: latestState, setState: applyState, fieldKey: key } = latestRef.current;
    if (latestState[key] == null) return;
    applyState({ ...latestState, [key]: null });
  }, [neuronSetSignature]);

  const { data, isLoading, isError, error } = useNeuronalManipulationProperties({
    workspace,
    entityId,
    endpoint,
    neuronSet,
  });

  let reason: ReactNode | null = null;
  if (isError) {
    const endpointMessage = extractEndpointErrorMessage(error);
    reason = (
      <div className="flex flex-col gap-1">
        <span className="text-error font-medium">{ERROR_MESSAGE}</span>
        {endpointMessage && <span className="text-gray-400">{endpointMessage}</span>}
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
