'use client';

import { RiCalendarLine } from '@remixicon/react';
import { format } from 'date-fns';
import { useState } from 'react';

import { Calendar } from '@/ui/molecules/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';
import type { DateRange } from 'react-day-picker';

const DISPLAY_FORMAT = 'MMM d, yyyy';

const TRIGGER_CLASS =
  'flex h-9 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-primary-8 outline-none transition-colors hover:border-gray-300 focus-visible:border-primary-6';
const POPOVER_CLASS = 'w-auto rounded-2xl border-gray-100 bg-white p-0 shadow-lg';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: ComponentProps<typeof Calendar>['disabled'];
}

/**
 * Single-date picker: a click-to-open trigger showing the selected date, opening the
 * {@link Calendar} (month/year dropdowns) in a popover. Selection is calendar-only —
 * no typeable input. Picking a day does not close the popover.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(TRIGGER_CLASS, !value && 'text-gray-400', className)}>
          <RiCalendarLine size={15} className="shrink-0 text-gray-400" />
          <span className="truncate">{value ? format(value, DISPLAY_FORMAT) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={POPOVER_CLASS} align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  /** month panes in the calendar popover (default 1, so it fits compact panels) */
  numberOfMonths?: number;
  disabled?: ComponentProps<typeof Calendar>['disabled'];
}

/**
 * Range date picker: a click-to-open trigger showing "from – to", opening the
 * {@link Calendar} (month/year dropdowns) in a popover. Selection is calendar-only —
 * no typeable input. Picking days does not close the popover, so a full range can be
 * built before the caller commits.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  className,
  numberOfMonths = 1,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const label = value?.from
    ? value.to
      ? `${format(value.from, DISPLAY_FORMAT)} – ${format(value.to, DISPLAY_FORMAT)}`
      : format(value.from, DISPLAY_FORMAT)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(TRIGGER_CLASS, !value?.from && 'text-gray-400', className)}
        >
          <RiCalendarLine size={15} className="shrink-0 text-gray-400" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={POPOVER_CLASS} align="end" side="bottom">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
