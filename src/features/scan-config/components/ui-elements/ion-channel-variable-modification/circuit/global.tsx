'use client';

import {
  type TUseCircuitManipulationDataParams,
  useCircuitManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/use-circuit-manipulation-data';
import { GlobalModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';

/** Props for the Circuit full-neuron variable modification UI. */
export type CircuitGlobalProps = TUseCircuitManipulationDataParams & {
  disabled: boolean;
  modificationType: string;
  errorPathPrefix?: string;
};

/**
 * Circuit UI for `ion_channel_variable_modification_by_neuron`.
 *
 * @param props - Neuron-set source, endpoint/entity, and form field wiring.
 * @returns Presentational modification UI backed by {@link useCircuitManipulationData}.
 * @see Global
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
