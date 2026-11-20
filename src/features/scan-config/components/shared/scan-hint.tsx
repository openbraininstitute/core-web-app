import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import type { ReactElement, ReactNode } from 'react';

/** Hover text for the + that turns a field into a scan, or adds to one. */
export const ScanHint = {
  expandValues:
    'Each value runs as its own configuration. Scan more than one field and every combination runs.',
  addValue: 'Add another value to the scan. Each value runs as its own configuration.',
  addGroup: 'Add another group to the scan. Each group runs as its own configuration.',
  addToList: 'Each one you add runs as its own configuration.',
} as const;

/** True when `target` sits in a control showing a scan hint (see `FieldDescriptionTooltip`). */
export function isScanHintTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-scan-hint]') !== null;
}

/**
 * Hover hint on a control that starts or grows a scan.
 *
 * `title` heads the hint for icon-only buttons, whose label is otherwise unseen;
 * buttons that show their label as text leave it out.
 */
export function ScanHintTooltip({
  hint,
  title,
  children,
}: {
  hint: ReactNode;
  title?: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild data-scan-hint="">
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-64 text-left text-wrap">
        {title && <span className="block font-semibold">{title}</span>}
        <span className="block">{hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}
