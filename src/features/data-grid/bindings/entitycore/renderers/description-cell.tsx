import { RiMoreLine } from '@remixicon/react';
import { useLayoutEffect, useRef, useState } from 'react';

import {
  GRID_ICON_BUTTON_ACTIVE_CLASS,
  GRID_OVERLAY_Z_CLASS,
} from '@/features/data-grid/react/molecules-theme';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the clamped description cell. */
export const DESCRIPTION_RENDERER = 'description';

/** Half of `leading-5.5` (22px), used only if the computed line-height is unreadable. */
const HALF_LINE_FALLBACK_PX = 11;

/** Description cell: two clamped lines, with the full text behind a popover when clipped. */
export function DescriptionCell({ value }: ICellRendererProps<unknown>) {
  const text = typeof value === 'string' ? value.trim() : '';
  const textRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `text` re-triggers the measurement
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const measure = () => {
      if (element.clientWidth === 0 || element.clientHeight === 0) {
        setOverflows(false);
        return;
      }
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      const tolerance = Number.isFinite(lineHeight) ? lineHeight / 2 : HALF_LINE_FALLBACK_PX;
      setOverflows(element.scrollHeight - element.clientHeight > tolerance);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [text]);

  if (!text) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;

  return (
    <div className="relative flex h-full w-full items-center">
      <p
        ref={textRef}
        className="line-clamp-2 w-full pr-7 leading-5.5 whitespace-normal wrap-break-word"
      >
        {text}
      </p>
      {overflows && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Show the full description"
              className={cn(
                'absolute right-0 inline-flex size-6 items-center justify-center rounded-full',
                'bg-gray-100 text-gray-600 shadow-sm ring-1 ring-gray-200/70',
                GRID_ICON_BUTTON_ACTIVE_CLASS
              )}
            >
              <RiMoreLine size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            className={cn(
              GRID_OVERLAY_Z_CLASS,
              'w-80 rounded-2xl border-gray-100 bg-white p-4 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]'
            )}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                Description
              </span>
              <p className="max-h-64 overflow-y-auto text-sm leading-5 text-primary-8 wrap-break-word">
                {text}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
