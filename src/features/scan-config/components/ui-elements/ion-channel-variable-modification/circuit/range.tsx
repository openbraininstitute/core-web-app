'use client';

import {
  type TUseCircuitManipulationDataParams,
  useCircuitManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/use-circuit-manipulation-data';
import { RangeModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

/** Props for the Circuit section-list variable modification UI. */
export type CircuitRangeProps = TUseCircuitManipulationDataParams & {
  disabled: boolean;
  modificationType: string;
  errorPathPrefix?: string;
  /** Title, info and message for the field frame. */
  chrome?: FancyChrome;
};

/**
 * Circuit UI for `ion_channel_variable_modification_by_section_list`.
 *
 * @param props - Neuron-set source, endpoint/entity, and form field wiring.
 * @returns Presentational modification UI backed by {@link useCircuitManipulationData}.
 * @see Range
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
  chrome,
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
      chrome={chrome}
    />
  );
}
