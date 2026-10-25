'use client';

import { RiArrowDownSLine, RiEqualizerLine } from '@remixicon/react';
import { useLayoutEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/**
 * A plot's row of controls along its top, over the plot. Once the plot is too
 * narrow for the row, which would run past the box it sits in, the row becomes
 * one "Options" pill opening the same controls in a panel.
 */
export function CollapsingControls({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const row = rowRef.current;
    if (!box || !row) return;
    const measure = () => setCollapsed(row.offsetWidth > box.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(row);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    // Clicks between the controls reach the plot under them.
    <div ref={boxRef} className="pointer-events-none absolute inset-x-0 top-0 z-10">
      {/* The row at its own width, out of sight and out of reach, to know whether it fits. */}
      <div
        ref={rowRef}
        aria-hidden
        inert
        className="invisible absolute top-0 left-0 flex w-max items-center gap-2"
      >
        {children}
      </div>
      {collapsed ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(PILL_CLASS, 'pointer-events-auto')}>
              <RiEqualizerLine className="size-4" />
              Options
              <RiArrowDownSLine className="size-4 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="border-neutral-2 flex w-auto flex-col items-start gap-2 bg-white p-3 shadow-lg"
          >
            {children}
          </PopoverContent>
        </Popover>
      ) : (
        <div className="pointer-events-auto flex w-max items-center gap-2">{children}</div>
      )}
    </div>
  );
}
