'use client';

import {
  GlobalModificationBase,
  type GlobalModificationBaseProps,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';

/**
 * MEModel (single-neuron) variant of `ion_channel_variable_modification_by_neuron`.
 *
 * Variables come from the form-level mapped-circuit-properties config; there is no
 * neuron-set selection, so this is a thin pass-through to the presentational base.
 * The circuit variant lives in `../circuit/circuit-global.tsx` and must not reuse this.
 */
export function Global(props: Omit<GlobalModificationBaseProps, 'loading' | 'reason'>) {
  return <GlobalModificationBase {...props} />;
}
