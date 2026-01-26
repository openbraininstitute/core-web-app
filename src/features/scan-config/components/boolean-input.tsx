'use client';

import { Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useCallback, useId } from 'react';

export interface BooleanInputProps {
  /** Current value of the boolean input */
  value: boolean | null;
  /** Callback fired when the value changes */
  onChange: (value: boolean) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * BooleanInput component for scan-config forms.
 *
 * Renders a checkbox for boolean schema properties with `ui_element: 'boolean_input'`.
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
  ariaLabel,
}: BooleanInputProps) {
  const id = useId();

  // Normalize null to false for the checkbox component
  const normalizedValue = value === true;

  const handleChange = useCallback(
    (e: CheckboxChangeEvent) => {
      onChange(e.target.checked);
    },
    [onChange]
  );

  return (
    <Checkbox
      id={id}
      checked={normalizedValue}
      onChange={handleChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className="[&_.ant-checkbox-inner]:w-6 [&_.ant-checkbox-inner]:h-6 [&_.ant-checkbox-inner]:rounded [&_.ant-checkbox-inner]:border-gray-300 [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-8 [&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-8"
    />
  );
}
