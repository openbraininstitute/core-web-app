'use client';

import { type ReactNode, useId, useState } from 'react';

import { cn } from '@/utils/css-class';

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * A CSS-positioned tooltip. Deliberately not portalled — every trigger in the
 * app sits inside a scroll container that the tooltip should travel with.
 */
export function Tooltip({ label, children, side = 'bottom', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const position = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[side];

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && label ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'bg-primary-9 pointer-events-none absolute z-50 w-max max-w-64 rounded-md px-2.5 py-1',
            'text-xs font-medium text-balance text-white shadow-lift',
            position
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
