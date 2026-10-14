'use client';

import { useId } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyCombobox } from '@/ui/molecules/fancy-combobox';

import type { StringSelection as TStringSelection } from '@/features/scan-config/types';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

export interface IStringSelectionProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  paramSchema: TStringSelection;
  chrome?: FancyChrome;
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
  chrome,
}: IStringSelectionProps) {
  const dropdownId = useId();
  const options = paramSchema.enum.map((key) => ({ label: key, value: key }));

  return (
    <FancyCombobox
      {...chrome}
      data-testid="scan-config-control"
      data-scan-config-options={dropdownId}
      data-scan-config-block-element={ScanConfigUIElementDict.StringSelection}
      disabled={disabled}
      options={options}
      values={value === null ? [] : [value]}
      onChange={([next]) => next !== undefined && onChange(next)}
      renderOption={(option) => (
        <span
          data-testid={`scan-config-option-${option.value}`}
          data-scan-config-option-of={dropdownId}
        >
          {option.label}
        </span>
      )}
    />
  );
}
