'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { type ReactNode, useEffect, useRef } from 'react';

import { getObiOneErrorReason, toObiOneErrorBody } from '@/api/one/utils';
import { useNeuronalManipulationProperties } from '@/features/scan-config/components/hooks/use-neuronal-manipulation-properties';
import { resolveNeuronSet } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/state';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { Config, ConfigValue } from '@/features/scan-config/types';

const NO_VARIABLES_MESSAGE = 'No ion-channel variables are available for the selected neuron set.';
const ERROR_MESSAGE = 'Could not load variables for the selected neuron set.';

const WARNINGS_HEADLINE = 'Nothing to tune here';

/** Soft note for an empty result: a friendly headline, then the endpoint's reasons. */
function WarningsNote({ warnings }: { warnings: string[] }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <InfoCircleOutlined className="text-primary-8 mt-1" />
      <div className="flex flex-col gap-1">
        <span className="text-primary-9 font-medium">{WARNINGS_HEADLINE}</span>
        {warnings.map((warning) => (
          <span key={warning} className="text-sm text-gray-500">
            {warning}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Parameters for {@link useCircuitManipulationData}. */
export type TUseCircuitManipulationDataParams = {
  config: Config;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  /** Sibling field holding the neuron-set reference (`property_source_field`). */
  sourceField: string;
  /** Modification field key being edited. */
  fieldKey: string;
  /** Schema `property_endpoints.NeuronalManipulation` path. */
  endpoint: string | undefined;
  /** Target Circuit entity id. */
  entityId: string | undefined;
};

/** Data and gating state for Circuit neuronal-manipulation UI. */
export type TCircuitManipulationData = {
  data: MechanismVariablesRoot | null;
  loading: boolean;
  /** Status note for the picker (error / endpoint warnings / empty); `null` when usable. */
  reason: ReactNode | null;
};

/**
 * Resolves the sibling neuron set, fetches Circuit mechanism variables, and clears
 * the modification when the targeted neuron set changes.
 *
 * @param params - Form config/state, source field, endpoint, and Circuit entity id.
 * @returns Mechanism variables, loading flag, and optional status reason.
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
    includeNeuronSet: true,
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
  } else if (!isLoading && data && Object.keys(data.variables).length === 0) {
    // The endpoint says why there is nothing (e.g. the neuron set selects no neurons).
    reason =
      data.warnings.length > 0 ? <WarningsNote warnings={data.warnings} /> : NO_VARIABLES_MESSAGE;
  }

  return {
    data: data?.variables ?? null,
    loading: isLoading,
    reason,
  };
}
