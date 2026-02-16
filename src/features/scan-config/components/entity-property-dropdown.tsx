import { Select } from 'antd';
import { get } from 'es-toolkit/compat';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { TUsabilityAndPropertyMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

export default function EntityPropertyDropdown({
  value,
  onChange,
  property,
  disabled = false,
  usabilityPropertyMappingConfig,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  property: string;
  disabled?: boolean;
  usabilityPropertyMappingConfig: TUsabilityAndPropertyMappingConfiguration;
}) {
  const options = get(usabilityPropertyMappingConfig.properties, property, []) as string[];

  return (
    <Select
      data-scan-config-block-element={ScanConfigUIElementDict.EntityPropertyDropdown}
      showSearch
      mode="multiple"
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
