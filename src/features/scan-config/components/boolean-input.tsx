'use client';

import { Switch } from 'antd';
import { useCallback, useId } from 'react';

export interface BooleanInputProps {
  /** Current value of the boolean input */
  value: boolean | null;
  /** Callback fired when the value changes */
  onChange: (value: boolean) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional label for true state */
  trueLabel?: string;
  /** Optional label for false state */
  falseLabel?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * BooleanInput component for scan-config forms.
 *
 * Renders a toggle switch for boolean schema properties with `ui_element: 'boolean_input'`.
 * Handles null values by treating them as false (unchecked state).
 *
 * @example
 * // In schema:
 * {
 *   "do_virtual": {
 *     "type": "boolean",
 *     "title": "Include Virtual Populations",
 *     "description": "Include virtual neurons...",
 *     "default": true,
 *     "ui_element": "boolean_input"
 *   }
 * }
 */
export default function BooleanInput({
  value,
  onChange,
  disabled = false,
  trueLabel,
  falseLabel,
  ariaLabel,
}: BooleanInputProps) {
  const id = useId();

  // Normalize null to false for the switch component
  const normalizedValue = value === true;

  const handleChange = useCallback(
    (checked: boolean) => {
      onChange(checked);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        checked={normalizedValue}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="bg-gray-300 [&.ant-switch-checked]:bg-primary-8"
      />
      {(trueLabel || falseLabel) && (
        <label
          htmlFor={id}
          className={`text-sm select-none ${disabled ? 'text-gray-400' : 'text-gray-700 cursor-pointer'}`}
        >
          {normalizedValue ? trueLabel : falseLabel}
        </label>
      )}
    </div>
  );
}
