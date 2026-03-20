'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/utils/css-class';

import type * as React from 'react';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipArrow({ ...props }: React.ComponentProps<typeof TooltipPrimitive.TooltipArrow>) {
  return <TooltipPrimitive.Arrow data-slot="tooltip-arrow" {...props} />;
}

function TooltipContent({
  className,
  arrowClassName,
  showArrow = true,
  sideOffset = 0,
  children,
  portalProps,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  arrowClassName?: React.ComponentProps<'span'>['className'];
  showArrow?: boolean;
  portalProps?: TooltipPrimitive.TooltipPortalProps;
}) {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'bg-primary-9 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance text-white',
          className
        )}
        {...props}
      >
        {children}
        {showArrow && (
          <TooltipPrimitive.Arrow
            className={cn(
              'z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-current fill-transparent',
              arrowClassName
            )}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger };
