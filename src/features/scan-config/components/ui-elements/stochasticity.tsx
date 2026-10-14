'use client';

import BooleanInput from '@/features/scan-config/components/ui-elements/boolean-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

export interface IStochasticityProps {
  fieldKey: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  chrome?: FancyChrome;
}

/**
 * Renderer for the `stochasticity` schema UI element.
 *
 * The field is a boolean at heart (enable stochastic mechanisms globally), so this is a thin
 * wrapper that delegates to {@link BooleanInput}.
 */
export function Stochasticity({
  fieldKey,
  value,
  onChange,
  disabled,
  ariaLabel,
  chrome,
}: IStochasticityProps) {
  return (
    <BooleanInput
      fieldKey={fieldKey}
      value={value}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={ariaLabel}
      chrome={chrome}
    />
  );
}
