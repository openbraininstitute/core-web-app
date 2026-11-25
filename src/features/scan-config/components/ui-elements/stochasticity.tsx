'use client';

import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';

import type { TControlAria } from '@/features/scan-config/components/ui-elements/registry';

export interface IStochasticityProps {
  id?: string;
  aria?: TControlAria;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Renderer for the `stochasticity` schema UI element.
 *
 * The field is a boolean at heart (enable stochastic mechanisms globally), so this is a thin
 * wrapper that delegates to {@link BooleanInput}.
 */
export function Stochasticity({ id, aria, value, onChange, disabled }: IStochasticityProps) {
  return <BooleanInput id={id} aria={aria} value={value} onChange={onChange} disabled={disabled} />;
}
