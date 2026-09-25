import { InputNumber } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

/**
 * A single required number input for the `float_input` schema element: a bare number, no sweep
 * and no null branch. Empty is valid (the schema default applies); non-numeric text is not.
 */
export function FloatInput({
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
  // antd keeps invalid text (letters) on screen but reports the parsed value as null, so track
  // the raw string to tell non-numeric input apart from an empty field.
  const [rawInput, setRawInput] = useState('');

  const errorMessage = (() => {
    if (rawInput.trim() !== '' && Number.isNaN(Number(rawInput))) return 'Value must be a number';
    if (isNil(value)) return undefined;
    if (!isNil(min) && value < min) return `Value should be greater than or equal to ${min}`;
    if (!isNil(max) && value > max) return `Value should be less than or equal to ${max}`;
    if (!isNil(exclusiveMin) && value <= exclusiveMin)
      return `Value should be greater than ${exclusiveMin}`;
    if (!isNil(exclusiveMax) && value >= exclusiveMax)
      return `Value should be less than ${exclusiveMax}`;
  })();

  return (
    <div className="relative" data-scan-config-block-element={ScanConfigUIElementDict.FloatInput}>
      <InputNumber
        data-testid="scan-config-control"
        controls={false}
        disabled={disabled}
        status={errorMessage ? 'error' : undefined}
        value={value}
        onInput={setRawInput}
        onChange={onChange}
        className="w-full"
      />

      {errorMessage && <span className="text-red-500">{errorMessage}</span>}
    </div>
  );
}

export default FloatInput;
