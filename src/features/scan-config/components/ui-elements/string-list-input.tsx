'use client';

import { StringListBase } from '@/features/scan-config/components/ui-elements/string-list';

export interface IStringListInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** render only the list of values, no controls */
  readOnly?: boolean;
}

/** `string_list_input`: a non-nullable list of strings; removing the last entry leaves `[]`. */
export function StringListInput({ value, onChange, disabled, readOnly }: IStringListInputProps) {
  return (
    <StringListBase
      value={value}
      // non-optional, so StringListBase never emits null
      onChange={(next) => onChange(next ?? [])}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export default StringListInput;
