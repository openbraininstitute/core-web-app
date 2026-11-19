'use client';

import { motion, useReducedMotion } from 'motion/react';

import { EASE_OUT } from '@/features/logbook/lib/ease';
import { cn } from '@/features/logbook/lib/utils';

import type { ComponentProps, ReactNode, Ref } from 'react';

/** Presentation only: the unanimated parent owns measurement and positioning. */
export function TooltipSurface({
  children,
  className,
  ref,
  ready = true,
  style,
  ...props
}: Omit<ComponentProps<typeof motion.span>, 'children'> & {
  children?: ReactNode;
  /** Start the entrance only after the positioning layer has been measured. */
  ready?: boolean;
  ref?: Ref<HTMLSpanElement>;
}) {
  const reduce = useReducedMotion();
  const closed = { opacity: 0, scale: reduce ? 1 : 0.94 };
  return (
    <motion.span
      ref={ref}
      role="tooltip"
      initial={closed}
      animate={{
        ...(ready ? { opacity: 1, scale: 1 } : closed),
        transition: { duration: 0.18, ease: EASE_OUT },
      }}
      exit={{ ...closed, transition: { duration: 0.12, ease: EASE_OUT } }}
      style={{ transformOrigin: 'var(--tooltip-origin, center)', ...style }}
      className={cn(
        'block whitespace-nowrap rounded-lg border border-rule bg-white px-2.5 py-1 text-xs font-medium text-primary-9 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </motion.span>
  );
}
