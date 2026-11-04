'use client';

import { Select } from 'antd';
import { get } from 'es-toolkit/compat';
import { useId, useMemo } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import { scanConfigHeldTestId } from '../utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

type TOption = { value: string; label: string };

/** The stored values the entity does not have, such as after choosing another entity. */
export function valuesOutsideOptions(value: string[], options: TOption[]) {
  if (options.length === 0) return [];
  const known = new Set(options.map((option) => option.value));
  return value.filter((held) => !known.has(held));
}

/** `entity_property_multi_select`: any number of an entity's own items, none by default. */
export function EntityPropertyMultiSelect({
  value,
  onChange,
  property,
  disabled,
  schemaMappingConfig,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  property: string;
  disabled: boolean;
  schemaMappingConfig: TSchemaMappingConfiguration | undefined;
}) {
  const options = useMemo(
    () => get(schemaMappingConfig?.properties, property, []) as TOption[],
    [schemaMappingConfig?.properties, property]
  );
  const outside = valuesOutsideOptions(value, options);
  /** Ties this select's options to it: antd leaves every dropdown it has opened in the page. */
  const dropdownId = useId();

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.EntityPropertyMultiSelect}>
      <Select
        data-testid="scan-config-control"
        data-scan-config-options={dropdownId}
        labelRender={({ label, value: held }) => (
          <span data-testid={scanConfigHeldTestId(String(held))}>{label}</span>
        )}
        optionRender={(option) => (
          <span
            data-testid={`scan-config-option-${String(option.value)}`}
            data-scan-config-option-of={dropdownId}
            data-selected={value.includes(String(option.value))}
          >
            {option.label}
          </span>
        )}
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        maxTagCount="responsive"
        placeholder="None"
        className="w-full"
        status={outside.length > 0 ? 'error' : undefined}
        disabled={disabled}
        value={value}
        options={options}
        onChange={onChange}
      />
      {outside.length > 0 && (
        <span className="text-red-500">Not in this entity: {outside.join(', ')}</span>
      )}
    </div>
  );
}
