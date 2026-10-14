import { CloseOutlined } from '@ant-design/icons';
import { isNil } from 'es-toolkit/compat';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyNumberInput } from '@/ui/molecules/fancy-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

const UNSET_PLACEHOLDER = 'Not set';

/**
 * A float that can be left unset.
 *
 * `null` is a real choice here, not an empty field: the extraction settings cascade
 * feature > protocol > global, so clearing a value hands the decision to the level below
 * rather than sending a number. That is why the cleared state is labelled and reachable in
 * one click instead of relying on the user emptying the input.
 */
export function FloatOptional({
  value,
  min,
  max,
  exclusiveMin,
  exclusiveMax,
  onChange,
  disabled,
  chrome,
}: {
  value: number | null;
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  onChange: (value: number | null) => void;
  disabled: boolean;
  chrome?: FancyChrome;
}) {
  const errorMessage = (() => {
    if (isNil(value)) return undefined;
    if (!isNil(min) && value < min) return `Value should be greater than or equal to ${min}`;
    if (!isNil(max) && value > max) return `Value should be less than or equal to ${max}`;
    if (!isNil(exclusiveMin) && value <= exclusiveMin)
      return `Value should be greater than ${exclusiveMin}`;
    if (!isNil(exclusiveMax) && value >= exclusiveMax)
      return `Value should be less than ${exclusiveMax}`;
  })();

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.FloatOptional}>
      <FancyNumberInput
        {...chrome}
        data-testid="scan-config-optional-value"
        disabled={disabled}
        value={value}
        placeholder={UNSET_PLACEHOLDER}
        error={errorMessage ?? chrome?.error}
        onValueChange={onChange}
        actions={
          !disabled && !isNil(value)
            ? [
                {
                  key: 'clear',
                  'data-testid': 'scan-config-optional-clear',
                  label: 'Clear value',
                  icon: <CloseOutlined />,
                  onClick: () => onChange(null),
                },
              ]
            : undefined
        }
      />
    </div>
  );
}
