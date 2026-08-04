import { endOfDay, format, startOfDay } from 'date-fns';

import { FilterValueKind } from '../../core';

import type { DateRange } from 'react-day-picker';
import type { TFilterValue } from '../../core';

/** Which end of a date-range filter a picked calendar day represents. */
export const DateRangeBound = {
  From: 'from',
  To: 'to',
} as const;

export type TDateRangeBound = (typeof DateRangeBound)[keyof typeof DateRangeBound];

/** ISO-8601 with an explicit LOCAL offset (`2026-08-03T00:00:00.000+02:00`). */
const LOCAL_ISO_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";

/**
 * Serialize one picked calendar day into a `dateRange` filter value.
 *
 * Formatted in LOCAL time with the offset attached, never `toISOString()`: that rolls
 * the calendar day back in every UTC+ timezone, so picking today filters on yesterday.
 * The bounds cover the whole local day because entitycore types these params as
 * `AwareDatetime`, so a `__lte` at midnight makes "today → today" return nothing.
 */
export function calendarDayToParam(day: Date, bound: TDateRangeBound): string {
  const bounded = bound === DateRangeBound.From ? startOfDay(day) : endOfDay(day);
  return format(bounded, LOCAL_ISO_PATTERN);
}

/** Calendar selection → the store's `dateRange` filter value. */
export function dateRangeToFilterValue(range: DateRange | undefined): TFilterValue {
  return {
    kind: FilterValueKind.DateRange,
    from: range?.from ? calendarDayToParam(range.from, DateRangeBound.From) : null,
    to: range?.to ? calendarDayToParam(range.to, DateRangeBound.To) : null,
  };
}
