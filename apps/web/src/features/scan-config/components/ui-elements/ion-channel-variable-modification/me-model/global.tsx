'use client';

import {
  type TUseMeModelManipulationDataParams,
  useMeModelManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/use-memodel-manipulation-data';
import { GlobalModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';

import type { ConfigValue } from '@/features/scan-config/types';

/** Props for the MEModel full-neuron variable modification UI. */
export type MeModelGlobalProps = TUseMeModelManipulationDataParams & {
  disabled: boolean;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  fieldKey: string;
  modificationType: string;
  errorPathPrefix?: string;
};

/**
 * MEModel UI for `ion_channel_variable_modification_by_neuron`.
 *
 * @param props - Endpoint/entity fetch params plus form field wiring.
 * @returns Presentational modification UI backed by {@link useMeModelManipulationData}.
 * @see CircuitGlobal
 */
export function Global({
  endpoint,
  entityId,
  disabled,
  state,
  setState,
  fieldKey,
  modificationType,
  errorPathPrefix,
}: MeModelGlobalProps) {
  const { data, loading, reason } = useMeModelManipulationData({ endpoint, entityId });

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
