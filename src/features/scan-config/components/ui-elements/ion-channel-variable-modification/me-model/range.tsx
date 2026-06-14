'use client';

import {
  RangeModificationBase,
  type RangeModificationBaseProps,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

/**
 * MEModel (single-neuron) variant of `ion_channel_variable_modification_by_section_list`.
 *
 * Variables come from the form-level mapped-circuit-properties config; there is no
 * neuron-set selection, so this is a thin pass-through to the presentational base.
 * The circuit variant lives in `../circuit/circuit-range.tsx` and must not reuse this.
 */
export function Range(props: Omit<RangeModificationBaseProps, 'loading' | 'reason'>) {
  return <RangeModificationBase {...props} />;
}
