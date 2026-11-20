import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  accountingHref,
  dayBounds,
  jobPhase,
  reportUsage,
  splitLedgers,
} from '@/admin/sections/accounting/helpers';
import { AccountingPage, JobPhase } from '@/admin/sections/accounting/types';

import type { TAccountingJob, TJobReport, TLedgerEntry } from '@/admin/sections/accounting/types';

describe('dayBounds', () => {
  it('turns local days into an inclusive start and an exclusive end with an offset', () => {
    const { after, before } = dayBounds('2026-11-01', '2026-11-03');
    expect(after).toBe(dayjs('2026-11-01').startOf('day').toISOString());
    expect(before).toBe(dayjs('2026-11-04').startOf('day').toISOString());
    expect(after).toMatch(/Z$/);
  });

  it.each(['', '2026-13-01', '2026-02-30', 'yesterday'])('ignores %j', (value) => {
    expect(dayBounds(value, value)).toEqual({ after: undefined, before: undefined });
  });
});

const job = (fields: Partial<TAccountingJob>) =>
  ({
    reserved_at: null,
    started_at: null,
    finished_at: null,
    cancelled_at: null,
    ...fields,
  }) as TAccountingJob;

describe('jobPhase', () => {
  it.each([
    [{}, JobPhase.Created],
    [{ reserved_at: 't' }, JobPhase.Reserved],
    [{ reserved_at: 't', started_at: 't' }, JobPhase.Running],
    [{ started_at: 't', finished_at: 't' }, JobPhase.Finished],
    [{ reserved_at: 't', cancelled_at: 't' }, JobPhase.Cancelled],
    [{ started_at: 't', finished_at: 't', cancelled_at: 't' }, JobPhase.Expired],
  ])('%j is %s', (fields, phase) => {
    expect(jobPhase(job(fields))).toBe(phase);
  });
});

describe('splitLedgers', () => {
  it('sorts debited from credited by sign', () => {
    const ledger = (id: number, amount: string) => ({ id, amount }) as TLedgerEntry;
    const { debited, credited } = splitLedgers([ledger(1, '-12.50'), ledger(2, '12.50')]);
    expect(debited.map(({ id }) => id)).toEqual([1]);
    expect(credited.map(({ id }) => id)).toEqual([2]);
  });
});

describe('accountingHref', () => {
  it('builds a page link with its filters', () => {
    expect(accountingHref(AccountingPage.Jobs, { project: 'p 1' })).toBe(
      '/app/admin/accounting/jobs?project=p+1'
    );
    expect(accountingHref(AccountingPage.Accounts)).toBe('/app/admin/accounting/accounts');
  });
});

describe('reportUsage', () => {
  it('describes each charge type', () => {
    expect(reportUsage({ type: 'oneshot', count: 3 } as TJobReport)).toBe('3 units');
    expect(reportUsage({ type: 'longrun', duration: 75 } as TJobReport)).toBe('1min 15s');
  });

  it('leaves a type it does not know blank instead of failing', () => {
    expect(reportUsage({ type: 'gpu' } as unknown as TJobReport)).toBe('');
  });
});
