import { useId } from 'react';

import { type ParamSchema, ScanConfigUIElementDict } from '@/features/scan-config/types';

type TFieldKind = ParamSchema['ui_element'];

const ONE_CONTROL_KINDS: ReadonlySet<TFieldKind> = new Set<TFieldKind>([
  ScanConfigUIElementDict.StringInput,
  ScanConfigUIElementDict.FloatInput,
  ScanConfigUIElementDict.FloatOptional,
  ScanConfigUIElementDict.BooleanInput,
  ScanConfigUIElementDict.Stochasticity,
]);

/**
 * How a field's title names its control. A kind with one control gets `controlId`, which its
 * label points at; any other kind is a group named by the title (`labelId`).
 */
export function useFieldLabelling(kind: TFieldKind) {
  const id = useId();

  if (ONE_CONTROL_KINDS.has(kind)) return { controlId: id, labelId: undefined, group: {} } as const;
  return {
    controlId: undefined,
    labelId: id,
    group: { role: 'group', 'aria-labelledby': id },
  } as const;
}
