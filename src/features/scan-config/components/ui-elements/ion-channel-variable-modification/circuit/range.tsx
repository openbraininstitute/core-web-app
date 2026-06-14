'use client';

import {
  type TUseCircuitManipulationDataParams,
  useCircuitManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/use-circuit-manipulation-data';
import { RangeModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

export type CircuitRangeProps = TUseCircuitManipulationDataParams & {
  disabled: boolean;
  modificationType: string;
  errorPathPrefix?: string;
};

/**
 * circuit variant of `ion_channel_variable_modification_by_section_list`.
 *
 * unlike the me-model `Range`, variables are fetched per block from the selected
 * neuron set; this composes the shared data hook with the presentational base.
 */
export function CircuitRange({
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
}: CircuitRangeProps) {
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
    <RangeModificationBase
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
