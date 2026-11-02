'use client';

import { StringListBase } from '@/features/scan-config/components/ui-elements/string-list';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

export interface IStringListInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

/** `string_list_input`: a non-nullable list of strings; removing the last entry leaves `[]`. */
export function StringListInput({ value, onChange, disabled }: IStringListInputProps) {
  return (
    <StringListBase
      value={value}
      // non-optional, so StringListBase never emits null
      onChange={(next) => onChange(next ?? [])}
      disabled={disabled}
      blockElement={ScanConfigUIElementDict.StringListInput}
    />
  );
}

export default StringListInput;
