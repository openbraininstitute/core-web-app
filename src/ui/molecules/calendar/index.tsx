'use client';

import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { buttonVariants } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

export type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Calendar primitive built on `react-day-picker` (v10), styled to the app's design
 * language (rounded days, gray-200 chrome, primary-8 selection, light range fill).
 * Backs {@link DatePicker} and {@link DateRangePicker}. Layout is fully expressed
 * through `classNames`, so no react-day-picker base stylesheet import is needed.
 */
const DEFAULT_START_YEAR = 2000;
const DEFAULT_END_YEAR_OFFSET = 5;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();
  // A wide, dropdown-navigable year range so users can jump to any year directly
  // instead of stepping month-by-month with the arrows.
  const now = new Date();
  const resolvedStart = startMonth ?? new Date(DEFAULT_START_YEAR, 0);
  const resolvedEnd = endMonth ?? new Date(now.getFullYear() + DEFAULT_END_YEAR_OFFSET, 11);
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={resolvedStart}
      endMonth={resolvedEnd}
      className={cn('p-3', className)}
      classNames={{
        months: cn('relative flex flex-col gap-4 sm:flex-row', d.months),
        month: cn('flex flex-col gap-4', d.month),
        month_caption: cn('flex h-9 items-center justify-center', d.month_caption),
        caption_label: cn(
          'flex items-center gap-1 text-sm font-medium text-primary-8',
          d.caption_label
        ),
        // month / year dropdowns for fast navigation (native selects, overlaid)
        dropdowns: cn('flex items-center justify-center gap-1.5', d.dropdowns),
        dropdown_root: cn(
          'relative inline-flex items-center rounded-lg border border-gray-200 px-2 py-1 text-sm font-medium text-primary-8 transition-colors hover:bg-gray-50',
          d.dropdown_root
        ),
        dropdown: cn('absolute inset-0 cursor-pointer opacity-0', d.dropdown),
        nav: cn('absolute inset-x-0 top-1 flex items-center justify-between px-1', d.nav),
        button_previous: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-7 rounded-full p-0 text-primary-8 hover:bg-gray-100',
          d.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-7 rounded-full p-0 text-primary-8 hover:bg-gray-100',
          d.button_next
        ),
        month_grid: cn('w-full border-collapse', d.month_grid),
        weekdays: cn('flex', d.weekdays),
        weekday: cn('w-9 text-[0.8rem] font-normal text-gray-400', d.weekday),
        week: cn('mt-1 flex w-full', d.week),
        day: cn('relative size-9 p-0 text-center text-sm', d.day),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 rounded-full p-0 font-normal text-primary-8 hover:bg-gray-100 aria-selected:opacity-100',
          d.day_button
        ),
        // range fill: light bg on the cell, transparent button so the ends stand out
        range_start: cn('rounded-l-full bg-primary-1', d.range_start),
        range_middle: cn(
          'rounded-none bg-primary-1 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-primary-8 [&>button]:hover:bg-primary-2',
          d.range_middle
        ),
        range_end: cn('rounded-r-full bg-primary-1', d.range_end),
        selected: cn(
          '[&>button]:bg-primary-8 [&>button]:text-white [&>button]:hover:bg-primary-9',
          d.selected
        ),
        today: cn('[&>button]:font-semibold [&>button]:text-primary-7', d.today),
        outside: cn('text-gray-300', d.outside),
        disabled: cn('text-gray-300 opacity-50', d.disabled),
        hidden: cn('invisible', d.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <RiArrowLeftSLine size={16} /> : <RiArrowRightSLine size={16} />,
      }}
      {...props}
    />
  );
}
