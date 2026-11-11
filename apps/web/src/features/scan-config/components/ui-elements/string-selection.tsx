'use client';

import { Select } from 'antd';
import { useId } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { StringSelection as TStringSelection } from '@/features/scan-config/types';

export interface IStringSelectionProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  paramSchema: TStringSelection;
}

/**
 * Plain dropdown for the `string_selection` schema UI element: a simple single-select over the
 * field's `enum`, showing each value as-is. Unlike `string_selection_enhanced`, it renders no
 * per-option descriptions, formulas, or expand modal.
 */
export function StringSelection({
  value,
  onChange,
  disabled = false,
  paramSchema,
}: IStringSelectionProps) {
  const dropdownId = useId();
  const options = paramSchema.enum.map((key) => ({ label: key, value: key }));

  return (
    <Select
      data-testid="scan-config-control"
      data-scan-config-options={dropdownId}
      data-scan-config-block-element={ScanConfigUIElementDict.StringSelection}
      className="w-full"
      disabled={disabled}
      optionRender={(option) => (
        <span
          data-testid={`scan-config-option-${String(option.value)}`}
          data-scan-config-option-of={dropdownId}
        >
          {option.label}
        </span>
      )}
      onChange={(newValue: string) => onChange(newValue)}
      value={value}
      options={options}
    />
  );
}
