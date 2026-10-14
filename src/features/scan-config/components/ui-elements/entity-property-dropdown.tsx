import { get } from 'es-toolkit/compat';
import { useEffect, useId, useMemo } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyCombobox } from '@/ui/molecules/fancy-combobox';

import { scanConfigHeldTestId } from '../utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

export function EntityPropertyDropdown({
  value,
  onChange,
  property,
  disabled = false,
  schemaMappingConfig,
  multiple = true,
  chrome,
}: {
  value: string | Array<string>;
  onChange: (v: string | Array<string>) => void;
  property: string;
  disabled?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  multiple?: boolean;
  chrome?: FancyChrome;
}) {
  const options = useMemo(
    () => get(schemaMappingConfig?.properties, property, []) as Array<string>,
    [schemaMappingConfig?.properties, property]
  );

  /** Ties this select's options to this select, so an option is told apart from the same
   * option in another field. */
  const dropdownId = useId();

  const values = (Array.isArray(value) ? value : [value]).filter(Boolean).map(String);

  useEffect(() => {
    if (options.length > 0 && value.length === 0) {
      onChange([options[0]]);
    }
  }, [options, onChange, value]);

  return (
    <FancyCombobox
      {...chrome}
      data-testid="scan-config-control"
      data-scan-config-options={dropdownId}
      data-scan-config-block-element={`${ScanConfigUIElementDict.EntityPropertyDropdown}__${multiple ? 'multiple' : 'singular'}`}
      searchable
      multiple={multiple}
      // Every held value keeps its own mark: the e2e suite reads what a field holds from them.
      maxBadges={Number.POSITIVE_INFINITY}
      disabled={disabled}
      options={options.map((n) => ({ label: n, value: n }))}
      values={values}
      onChange={(next) => onChange(multiple ? next : next[0])}
      renderValue={(option) => (
        <span data-testid={scanConfigHeldTestId(option.value)}>{option.label}</span>
      )}
      renderOption={(option, selected) => (
        <span
          data-testid={`scan-config-option-${option.value}`}
          data-scan-config-option-of={dropdownId}
          data-selected={selected}
        >
          {option.label}
        </span>
      )}
    />
  );
}

export default EntityPropertyDropdown;
