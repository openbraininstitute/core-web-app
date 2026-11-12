'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';

export interface ISegment {
  value: string;
  label: ReactNode;
  id?: string;
  testId?: string;
}

interface ISegmentedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  segments: ReadonlyArray<ISegment>;
  id?: string;
  'aria-label'?: string;
  className?: string;
  /** applied to every segment, in both layers, so their labels line up */
  segmentClassName?: string;
}

/** Gap between segments, in rem; the clip arithmetic below depends on it. */
const GAP_REM = 0.25;

/** Equal-width pill tabs whose selection is a clipped navy copy, so label colour moves with it. */
export function SegmentedTabs({
  value,
  onValueChange,
  segments,
  id,
  'aria-label': ariaLabel,
  className,
  segmentClassName,
}: ISegmentedTabsProps) {
  const count = segments.length;
  const index = Math.max(
    0,
    segments.findIndex((s) => s.value === value)
  );
  const step = `((100% - ${(count - 1) * GAP_REM}rem) / ${count} + ${GAP_REM}rem)`;
  const columns: CSSProperties = {
    gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    gap: `${GAP_REM}rem`,
  };
  const segmentClass = cn(
    'flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap select-none',
    segmentClassName
  );

  return (
    <TabsPrimitive.Root
      id={id}
      data-testid={id}
      value={value}
      onValueChange={onValueChange}
      activationMode="manual"
      className={cn(
        'relative rounded-full border border-gray-100 bg-white p-1 shadow-sm',
        className
      )}
    >
      <TabsPrimitive.List aria-label={ariaLabel} className="grid" style={columns}>
        {segments.map((segment) => (
          <TabsPrimitive.Trigger
            key={segment.value}
            id={segment.id}
            data-testid={segment.testId}
            value={segment.value}
            className={cn(
              segmentClass,
              'text-primary-8 hover:bg-neutral-1 transition-colors',
              'focus-visible:outline-primary-6 focus-visible:outline-2 focus-visible:outline-offset-2'
            )}
          >
            {segment.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      <div
        aria-hidden
        className="bg-primary-9 pointer-events-none absolute inset-1 grid text-white transition-[clip-path] duration-250 ease-out-expo motion-reduce:transition-none"
        style={{
          ...columns,
          clipPath: `inset(0 calc(${count - 1 - index} * ${step}) 0 calc(${index} * ${step}) round 9999px)`,
        }}
      >
        {segments.map((segment) => (
          <span key={segment.value} className={segmentClass}>
            {segment.label}
          </span>
        ))}
      </div>
    </TabsPrimitive.Root>
  );
}
