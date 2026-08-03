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
 * Serialize ONE picked calendar day into the value carried by a `dateRange` filter
 * (and, unchanged, into `field__gte` / `field__lte`).
 *
 * The calendar hands back a LOCAL-midnight `Date`. `toISOString()` would convert it
 * to UTC and roll the calendar day BACK in every UTC+ timezone (3 Aug 00:00 +02:00
 * → `2026-08-02T22:00…Z`), so a user picking today filtered on yesterday. We instead
 * format in LOCAL time with the offset attached: the day the user picked is the day
 * that travels in the query, and the value is still an absolute instant.
 *
 * The bounds cover the WHOLE local day — `From` = 00:00:00.000, `To` = 23:59:59.999
 * — because entitycore types these params as `AwareDatetime` (a timezone-aware
 * *datetime*, not a date), so a `__lte` at midnight would exclude every row created
 * during the selected end day and make "today → today" return nothing.
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
