'use client';

import { useId } from 'react';

import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

/**
 * Minimal date picker built on the browser-native `<input type="date">`. Uses our
 * Input styling for visual consistency and zero JS overhead. Value is an ISO
 * `YYYY-MM-DD` string.
 *
 * Richer flows (ranges, time, presets) should compose this alongside a calendar
 * library; we don't pull one in by default.
 */

type DatePickerProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
};

function DatePicker({ value, onChange, min, max, id, className, ...props }: DatePickerProps) {
  const fallbackId = useId();
  return (
    <Input
      {...props}
      id={id ?? fallbackId}
      type="date"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      min={min}
      max={max}
      className={cn('w-44', className)}
    />
  );
}

type DateRangePickerProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  value?: { from?: string; to?: string };
  onChange?: (next: { from?: string; to?: string }) => void;
  min?: string;
  max?: string;
};

function DateRangePicker({ value, onChange, min, max, className, ...props }: DateRangePickerProps) {
  return (
    <div
      data-slot="date-range-picker"
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      <DatePicker
        aria-label="From"
        value={value?.from}
        onChange={(from) => onChange?.({ from, to: value?.to })}
        min={min}
        max={value?.to ?? max}
      />
      <span className="text-neutral-3 text-sm">→</span>
      <DatePicker
        aria-label="To"
        value={value?.to}
        onChange={(to) => onChange?.({ from: value?.from, to })}
        min={value?.from ?? min}
        max={max}
      />
    </div>
  );
}

export { DatePicker, DateRangePicker };
