import { FIELD_REGISTRY } from '@/features/scan-config/components/ui-elements/registry';
import { useField } from '@/features/scan-config/use-config-store';

import type { TFieldProps } from '@/features/scan-config/components/ui-elements/registry';

/** The control of one field of the block in scope; it re-renders only when that field changes. */
export function FieldControl(props: Omit<TFieldProps, 'value' | 'setValue'>) {
  const [value, setValue] = useField(props.fieldKey);
  const Field = FIELD_REGISTRY[props.paramSchema.ui_element];

  return Field ? <Field {...props} value={value} setValue={setValue} /> : null;
}
