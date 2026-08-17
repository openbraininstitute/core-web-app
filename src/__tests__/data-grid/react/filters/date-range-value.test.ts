/**
 * Regression: picking today in a date filter sent yesterday — `toISOString()` on the
 * local-midnight `Date` from react-day-picker rolls the day back in every UTC+ zone. The
 * suite pins `TZ=Europe/Zurich` so it cannot pass by accident on a UTC CI machine.
 */
import { beforeAll, describe, expect, it } from 'vitest';

// must be set before any Date is constructed
process.env.TZ = 'Europe/Zurich';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { OperatorId } from '@/features/data-grid/core';
import {
  calendarDayToParam,
  DateRangeBound,
  dateRangeToFilterValue,
} from '@/features/data-grid/react/filters/date-range-value';

import type { DateRange } from 'react-day-picker';
import type { IGridQuery, IGridSchema } from '@/features/data-grid/core';

type Row = { id: string };

const schema: IGridSchema<Row> = {
  id: 'test',
  columns: [
    {
      id: 'registrationDate',
      header: 'Registration date',
      filter: { operators: [OperatorId.DateRange], field: 'creation_date' },
    },
  ],
  getRowId: (r) => r.id,
};

/** 3 Aug 2026, LOCAL midnight — exactly what the calendar emits for "today". */
const pickedDay = () => new Date(2026, 7, 3);

function paramsFor(range: DateRange) {
  const q: IGridQuery = {
    page: 1,
    pageSize: 10,
    filters: {
      registrationDate: {
        columnId: 'registrationDate',
        operator: OperatorId.DateRange,
        value: dateRangeToFilterValue(range),
      },
    },
    sort: [],
  };
  return serializeQuery(q, schema);
}

describe('date-range filter value (local calendar day → __gte/__lte)', () => {
  beforeAll(() => {
    expect(new Date(2026, 7, 3).getTimezoneOffset()).not.toBe(0);
  });

  it('keeps the PICKED calendar day (no UTC roll-back) on both bounds', () => {
    const day = pickedDay();
    expect(calendarDayToParam(day, DateRangeBound.From)).toMatch(/^2026-08-03T/);
    expect(calendarDayToParam(day, DateRangeBound.To)).toMatch(/^2026-08-03T/);
  });

  it('emits TIMEZONE-AWARE datetimes (entitycore params are `AwareDatetime`)', () => {
    const day = pickedDay();
    // the backend rejects a naive datetime — an explicit offset (or Z) is required
    expect(calendarDayToParam(day, DateRangeBound.From)).toMatch(/(Z|[+-]\d{2}:\d{2})$/);
    expect(calendarDayToParam(day, DateRangeBound.To)).toMatch(/(Z|[+-]\d{2}:\d{2})$/);
  });

  it('spans the FULL local day: from = 00:00:00.000, to = 23:59:59.999', () => {
    const day = pickedDay();
    expect(calendarDayToParam(day, DateRangeBound.From)).toBe('2026-08-03T00:00:00.000+02:00');
    expect(calendarDayToParam(day, DateRangeBound.To)).toBe('2026-08-03T23:59:59.999+02:00');
  });

  it('serializes "today → today" to a range that CONTAINS today', () => {
    const day = pickedDay();
    const params = paramsFor({ from: day, to: day });
    expect(params.creation_date__gte).toBe('2026-08-03T00:00:00.000+02:00');
    expect(params.creation_date__lte).toBe('2026-08-03T23:59:59.999+02:00');

    const noonToday = new Date(2026, 7, 3, 12).getTime();
    expect(new Date(params.creation_date__gte as string).getTime()).toBeLessThanOrEqual(noonToday);
    expect(new Date(params.creation_date__lte as string).getTime()).toBeGreaterThanOrEqual(
      noonToday
    );
  });

  it('elides open ends', () => {
    const params = paramsFor({ from: pickedDay() });
    expect(params.creation_date__gte).toBe('2026-08-03T00:00:00.000+02:00');
    expect(params).not.toHaveProperty('creation_date__lte');
  });
});
