import { Select } from 'antd';
import { get } from 'es-toolkit/compat';
import { useEffect, useId, useMemo } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

export default function EntityPropertyDropdown({
  value,
  onChange,
  property,
  disabled = false,
  schemaMappingConfig,
  multiple = true,
}: {
  value: string | Array<string>;
  onChange: (v: string | Array<string>) => void;
  property: string;
  disabled?: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
  multiple?: boolean;
}) {
  const options = useMemo(
    () => get(schemaMappingConfig?.properties, property, []) as Array<string>,
    [schemaMappingConfig?.properties, property]
  );

  /** Ties this select's options to this select: antd leaves every dropdown it has
   * opened in the page, so an option is otherwise indistinguishable from the same
   * option in a field filled minutes ago. */
  const dropdownId = useId();

  const chosen = useMemo(
    () => new Set((Array.isArray(value) ? value : [value]).filter(Boolean).map(String)),
    [value]
  );

  useEffect(() => {
    if (options.length > 0 && value.length === 0) {
      onChange([options[0]]);
    }
  }, [options, onChange, value]);

  return (
    <Select
      data-testid="scan-config-control"
      data-scan-config-options={dropdownId}
      data-scan-config-block-element={`${ScanConfigUIElementDict.EntityPropertyDropdown}__${multiple ? 'multiple' : 'singular'}`}
      optionRender={(option) => (
        <span
          data-testid={`scan-config-option-${String(option.value)}`}
          data-scan-config-option-of={dropdownId}
          data-selected={chosen.has(String(option.value))}
        >
          {option.label}
        </span>
      )}
      showSearch
      mode={multiple ? 'multiple' : undefined}
      disabled={disabled}
      className="w-full"
      value={value}
      onChange={onChange}
      options={[
        ...options.map((n) => {
          return {
            label: n,
            value: n,
          };
        }),
      ]}
    />
  );
}
