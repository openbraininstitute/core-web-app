'use client';

import { Checkbox } from 'antd';
import { useCallback, useId } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { TControlAria } from '@/features/scan-config/components/ui-elements/registry';

export interface BooleanInputProps {
  id?: string;
  aria?: TControlAria;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * BooleanInput component for scan-config forms.

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
  id,
  aria,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: BooleanInputProps) {
  const instanceKey = useId();

  // Normalize null to false for the checkbox component
  const normalizedValue = value === true;

  const handleChange = useCallback(
    (e: CheckboxChangeEvent) => {
      onChange(e.target.checked);
    },
    [onChange]
  );

  return (
    <span data-scan-config-block-element={ScanConfigUIElementDict.BooleanInput} className="ml-4">
      <Checkbox
        data-testid="scan-config-control"
        key={instanceKey}
        id={id}
        {...aria}
        checked={normalizedValue}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          '[&_.ant-checkbox-inner]:w-6 [&_.ant-checkbox-inner]:h-6 [&_.ant-checkbox-inner]:rounded',
          '[&_.ant-checkbox-inner]:border-gray-300 [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-8 ',
          '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-8',
          '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
        )}
      />
    </span>
  );
}
