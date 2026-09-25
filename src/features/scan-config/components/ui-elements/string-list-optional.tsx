'use client';

import { StringListBase } from '@/features/scan-config/components/ui-elements/string-list';

export interface IStringListOptionalProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  disabled?: boolean;
}

/** `string_list_optional`: like `string_list_input` but removing the last entry writes `null`. */
export function StringListOptional({ value, onChange, disabled }: IStringListOptionalProps) {
  return <StringListBase optional value={value} onChange={onChange} disabled={disabled} />;
}

export default StringListOptional;
