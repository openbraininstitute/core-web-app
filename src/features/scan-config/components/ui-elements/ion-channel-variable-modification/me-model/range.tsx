'use client';

import {
  type TUseMeModelManipulationDataParams,
  useMeModelManipulationData,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/use-memodel-manipulation-data';
import { RangeModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

import type { ConfigValue } from '@/features/scan-config/types';

/** Props for the MEModel section-list variable modification UI. */
export type MeModelRangeProps = TUseMeModelManipulationDataParams & {
  disabled: boolean;
  value: ConfigValue | undefined;
  onChange: (next: ConfigValue) => void;
  modificationType: string;
  errorPathPrefix?: string;
};

/**
 * MEModel UI for `ion_channel_variable_modification_by_section_list`.
 *
 * @param props - Endpoint/entity fetch params plus form field wiring.
 * @returns Presentational modification UI backed by {@link useMeModelManipulationData}.
 * @see CircuitRange
 */
export function Range({
  endpoint,
  entityId,
  disabled,
  value,
  onChange,
  modificationType,
  errorPathPrefix,
}: MeModelRangeProps) {
  const { data, loading, reason } = useMeModelManipulationData({ endpoint, entityId });

  return (
    <RangeModificationBase
      data={data}
      loading={loading}
      reason={reason}
      disabled={disabled}
      value={value}
      onChange={onChange}
      modificationType={modificationType}
      errorPathPrefix={errorPathPrefix}
    />
  );
}
