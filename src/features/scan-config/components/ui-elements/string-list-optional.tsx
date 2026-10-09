'use client';

import { StringListBase } from '@/features/scan-config/components/ui-elements/string-list';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

export interface IStringListOptionalProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  disabled?: boolean;
}

/** `string_list_optional`: like `string_list_input` but removing the last entry writes `null`. */
export function StringListOptional({ value, onChange, disabled }: IStringListOptionalProps) {
  return (
    <StringListBase
      optional
      value={value}
      onChange={onChange}
      disabled={disabled}
      blockElement={ScanConfigUIElementDict.StringListOptional}
    />
  );
}

export default StringListOptional;
