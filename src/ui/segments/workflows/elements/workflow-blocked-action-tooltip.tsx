'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';

/** Distinct gray fill for lifecycle-blocked actions — not a faded copy of the enabled button. */
export const WORKFLOW_BLOCKED_ACTION_CLASS =
  'bg-gray-100! text-gray-400! border-gray-200! shadow-none! opacity-100 hover:bg-gray-100! hover:text-gray-400! disabled:bg-gray-100! disabled:text-gray-400! disabled:border-gray-200! disabled:shadow-none! disabled:opacity-100';

type WorkflowBlockedActionTooltipProps = {
  reason?: string;
  children: ReactNode;
  /** Stretch the trigger to the parent width (details-page side-menu actions). */
  fullWidth?: boolean;
  side?: ComponentProps<typeof TooltipContent>['side'];
  align?: ComponentProps<typeof TooltipContent>['align'];
};

/**
 * Disabled controls ignore pointer events, so the tooltip trigger is a wrapping
 * span. When there is no reason, children render unchanged.
 */
export function WorkflowBlockedActionTooltip({
  reason,
  children,
  fullWidth,
  side = 'left',
  align = 'end',
}: WorkflowBlockedActionTooltipProps) {
  if (!reason) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', fullWidth && 'w-full')}>{children}</span>
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side={side}
        showArrow
        align={align}
        sideOffset={0}
        className="max-w-72 whitespace-pre-line text-pretty text-primary-8 bg-gray-100"
        arrowClassName="bg-gray-100"
      >
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}
