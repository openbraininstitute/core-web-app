'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';

import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

interface ButtonCopyIdProps {
  className?: string;
  label?: string;
  /** Hover/focus tooltip. `false` drops it: the button keeps its `aria-label` only. */
  tooltip?: React.ReactNode | false;
  value: string;
  /** Drops the visible label; the tooltip becomes the only affordance. */
  iconOnly?: boolean;
  /** Replaces the visible `label` text (`label` still names the button for assistive tech). */
  children?: ReactNode;
  classNames?: {
    button?: string;
    /** The rounded box around the glyph. */
    icon?: string;
    /** The glyph itself. */
    glyph?: string;
    tooltip?: string;
    tooltipArrow?: string;
  };
}

export function ButtonCopyId({
  value,
  className,
  tooltip = 'Database ID',
  label = 'Copy ID',
  iconOnly = false,
  children,
  classNames,
}: ButtonCopyIdProps) {
  const [, copyCampaignId, , copyingCampaignId] = useCopyToClipboard();

  const button = (
    <Button
      rounded
      variant="ghost"
      type="button"
      aria-label={label}
      className={cn('text-primary-9', iconOnly ? 'size-9 p-0' : 'pr-1', classNames?.button)}
      size="md"
      onClick={() => copyCampaignId(value)}
    >
      {!iconOnly && (children ?? <span className="text-base">{label}</span>)}
      <div
        className={cn(
          'flex size-8 items-center justify-center border',
          'rounded-full border-neutral-2 border-solid hover:bg-gray-100 transition-colors',
          classNames?.icon
        )}
      >
        {copyingCampaignId ? (
          <RiCheckLine className="text-green-400! text-sm" />
        ) : (
          <RiFileCopyLine className={cn('text-sm text-gray-400', classNames?.glyph)} />
        )}
      </div>
    </Button>
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {tooltip === false ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            avoidCollisions
            sideOffset={-10}
            side="bottom"
            className={cn('z-999', classNames?.tooltip)}
            arrowClassName={cn('bg-primary-9! z-9999', classNames?.tooltipArrow)}
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
