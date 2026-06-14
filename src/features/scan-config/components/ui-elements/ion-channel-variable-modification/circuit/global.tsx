'use client';

import {
  type TUseCircuitManipulationDataParams,
  useCircuitManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/use-circuit-manipulation-data';
import { GlobalModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';

export type CircuitGlobalProps = TUseCircuitManipulationDataParams & {
  disabled: boolean;
  modificationType: string;
  errorPathPrefix?: string;
};

/**
 * circuit variant of `ion_channel_variable_modification_by_neuron`.
 *
 * unlike the me-model `Global`, variables are fetched per block from the selected
 * neuron set; this composes the shared data hook with the presentational base
 */
export function CircuitGlobal({
  config,
  state,
  setState,
  sourceField,
  fieldKey,
  endpoint,
  entityId,
  disabled,
  modificationType,
  errorPathPrefix,
}: CircuitGlobalProps) {
  const { data, loading, reason } = useCircuitManipulationData({
    config,
    state,
    setState,
    sourceField,
    fieldKey,
    endpoint,
    entityId,
  });

  return (
    <GlobalModificationBase
      data={data}
      loading={loading}
      reason={reason}
      disabled={disabled}
      state={state}
      setState={setState}
      fieldKey={fieldKey}
      modificationType={modificationType}
      errorPathPrefix={errorPathPrefix}
    />
  );
}
