import { FIELD_REGISTRY } from '@/features/scan-config/components/ui-elements/registry';
import { useField } from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { TFieldProps } from '@/features/scan-config/components/ui-elements/registry';

/** The control of one field of the block in scope; it re-renders only when that field changes. */
export function FieldControl(props: Omit<TFieldProps, 'value' | 'setValue'>) {
  const [value, setValue] = useField(props.fieldKey);
  const Field = FIELD_REGISTRY[props.paramSchema.ui_element];

  return Field ? <Field {...props} value={value} setValue={setValue} /> : null;
}

/** The title of a field: a label of its one control, or the name of its group of controls. */
export function FieldLabel({
  controlId,
  labelId,
  className,
  children,
}: {
  controlId: string | undefined;
  labelId: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (controlId) {
    return (
      <label htmlFor={controlId} className={className}>
        {children}
      </label>
    );
  }
  return (
    <span id={labelId} className={className}>
      {children}
    </span>
  );
}
