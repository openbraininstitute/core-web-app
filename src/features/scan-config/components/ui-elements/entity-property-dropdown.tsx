import { Select } from 'antd';
import { get } from 'es-toolkit/compat';
import { useEffect, useMemo, useRef } from 'react';

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
    () => get(schemaMappingConfig?.properties, property, []) as string[],
    [schemaMappingConfig?.properties, property]
  );

  const previousOptions = useRef<string[]>(null);

  useEffect(() => {
    if (options.length > 0 && options !== previousOptions.current) {
      onChange([options[0]]);
      previousOptions.current = options;
    }
  }, [options, onChange]);

  return (
    <Select
      data-scan-config-block-element={`${ScanConfigUIElementDict.EntityPropertyDropdown}__${multiple ? 'multiple' : 'singular'}`}
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
