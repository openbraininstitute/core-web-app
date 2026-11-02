'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import type { ReactElement, ReactNode } from 'react';

interface ILightTooltipProps {
  /** the explanation shown on hover */
  label: ReactNode;
  /** the hovered element; Radix hands it a ref and its handlers */
  children: ReactElement;
  /** screen-reader copy of the content, when it holds more than text (e.g. a button) */
  ariaLabel?: string;
  delayDuration?: number;
}

/**
 * The one hover card for the scope and editable icons: white, as wide as its text up to
 * 250px, hanging below the icon with its arrow a short way in from the left edge.
 */
export function LightTooltip({
  label,
  children,
  ariaLabel,
  delayDuration = 200,
}: ILightTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        // the card starts 12px left of the trigger, which the arrow below accounts for
        alignOffset={-12}
        sideOffset={8}
        aria-label={ariaLabel}
        // Radix flips its own arrow for a bottom card and hides the top borders, so the
        // arrow is drawn here instead
        showArrow={false}
        className="text-primary-9 relative w-max max-w-[250px] border border-gray-200 bg-white shadow-md"
      >
        {label}
        <span
          aria-hidden
          className="absolute -top-[6px] size-2.5 rotate-45 border-t border-l border-gray-200 bg-white"
          style={{ left: 'calc(12px + var(--radix-tooltip-trigger-width) / 2 - 5px)' }}
        />
      </TooltipContent>
    </Tooltip>
  );
}
