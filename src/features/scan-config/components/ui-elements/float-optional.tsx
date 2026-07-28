import { CloseOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useCallback } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

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
}: {
  value: number | null;
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  onChange: (value: number | null) => void;
  disabled: boolean;
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

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <div
      className="relative"
      data-scan-config-block-element={ScanConfigUIElementDict.FloatOptional}
    >
      <InputNumber
        controls={false}
        disabled={disabled}
        status={errorMessage ? 'error' : undefined}
        value={value}
        placeholder={UNSET_PLACEHOLDER}
        onChange={onChange}
        className="w-full"
      />

      {errorMessage && <span className="text-red-500">{errorMessage}</span>}

      {!disabled && !isNil(value) && (
        <button
          type="button"
          aria-label="Clear value"
          title="Clear value"
          className="absolute top-[10px] right-[8px]"
          onClick={handleClear}
        >
          <CloseOutlined className="text-primary-8!" />
        </button>
      )}
    </div>
  );
}
