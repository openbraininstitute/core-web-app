'use client';

import { Checkbox } from 'antd';
import { useCallback, useId } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { type FancyChrome, FancyInfo } from '@/ui/molecules/fancy-input';
import { cn } from '@/utils/css-class';

import type { CheckboxChangeEvent } from 'antd/es/checkbox';

export interface BooleanInputProps {
  fieldKey: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  chrome?: FancyChrome;
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
  fieldKey,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  chrome,
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

  const label = chrome?.label;

  return (
    // pulled in by its own padding, so stacked checkboxes sit close while keeping their hover area
    <div data-scan-config-block-element={ScanConfigUIElementDict.BooleanInput} className="-my-2">
      {/* A plain full-width row, not a field frame: the title fills the row and is the box's
          label, so clicking anywhere on it toggles; the info rides on it as a superscript. */}
      <div
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-1.5 transition-colors',
          !disabled && 'hover:bg-neutral-1',
          chrome?.classNames?.fieldset
        )}
      >
        {label && (
          <label
            htmlFor={fieldKey}
            className={cn(
              'min-w-0 flex-1 text-sm font-semibold text-primary-9',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            )}
          >
            {label}
            {chrome?.unit && (
              <span className="ms-1 font-normal text-neutral-4">({chrome.unit})</span>
            )}
            {chrome?.labelInfo && (
              <FancyInfo
                content={chrome.labelInfo}
                className="relative -top-1.5 ms-0.5 inline-flex size-4 bg-white align-middle ring-1 ring-neutral-2 hover:bg-primary-8 hover:text-white hover:ring-primary-8 [&_svg]:size-2.5"
              />
            )}
          </label>
        )}
        <Checkbox
          data-testid="scan-config-control"
          key={id}
          id={fieldKey}
          checked={normalizedValue}
          onChange={handleChange}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className={cn(
            'ms-auto',
            '[&_.ant-checkbox-inner]:h-5 [&_.ant-checkbox-inner]:w-5 [&_.ant-checkbox-inner]:rounded',
            '[&_.ant-checkbox-inner]:border-neutral-3 [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-8',
            '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-8',
            '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
          )}
        />
      </div>
      {chrome?.error && <p className="mt-1 px-3 text-xs text-destructive">{chrome.error}</p>}
    </div>
  );
}
