import { useId } from 'react';

import { type ParamSchema, ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useFieldIssue } from '@/features/scan-config/use-config-store';

import type { TControlAria } from '@/features/scan-config/components/ui-elements/registry';

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

/**
 * The issue to show at a field (`path` without its leading slash) and what links the control to
 * that message. `fallback` is used when the schema reports nothing at the field.
 */
export function useFieldIssueMark(path: string | undefined, fallback?: string) {
  const issueId = useId();
  const issue = useFieldIssue(path && `/${path}`) ?? fallback;
  const controlAria: TControlAria | undefined = issue
    ? { 'aria-invalid': true, 'aria-describedby': issueId }
    : undefined;

  return { issue, issueId: issue ? issueId : undefined, controlAria };
}
