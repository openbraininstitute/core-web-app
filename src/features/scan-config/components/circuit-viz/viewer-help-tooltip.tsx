'use client';

import { RiInfoI } from '@remixicon/react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Shared shell for the viewer's top-left help buttons, so they stay visually identical. */
export function ViewerHelpTooltip({
  label,
  title,
  children,
  container,
  width = 'w-64',
}: {
  /** Accessible name for the trigger. */
  label: string;
  title: string;
  children: ReactNode;
  /** Portal target while fullscreen; null → document.body. */
  container?: HTMLElement | null;
  width?: string;
}) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full transition-colors',
            'bg-white text-neutral-500 shadow-md ring-1 ring-black/5',
            'hover:bg-neutral-100 hover:text-primary-9 focus-visible:outline-none'
          )}
        >
          <RiInfoI className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        align="start"
        side="right"
        sideOffset={8}
        showArrow={false}
        portalProps={container ? { container } : undefined}
        className={cn(
          width,
          'rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-xl text-neutral-800'
        )}
      >
        <p className="mb-2.5 text-xs font-medium text-primary-9">{title}</p>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/** One `action → keys` line inside a help tooltip. */
export function ViewerHelpRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      <span className="flex flex-wrap items-center justify-end gap-1">
        {keys.map((key, index) => (
          <span key={key} className="inline-flex items-center gap-1">
            {index > 0 && <span className="text-[10px] text-neutral-400">+</span>}
            <KeyBadge>{key}</KeyBadge>
          </span>
        ))}
      </span>
    </li>
  );
}

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5',
        'bg-neutral-100 text-[10px] font-medium tracking-wide text-neutral-700',
        'ring-1 ring-neutral-200/80'
      )}
    >
      {children}
    </kbd>
  );
}
