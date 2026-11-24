import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  accountingHref,
  accountLinks,
  amountField,
  chargedTiers,
  checkPriceEdit,
  dayBounds,
  describeStatusChange,
  discountUpdate,
  fractionToPercent,
  jobPhase,
  percentField,
  percentToFraction,
  plainDecimal,
  priceAt,
  priceBody,
  priceKey,
  priceValues,
  reportUsage,
  shiftDecimal,
  splitLedgers,
  tierCost,
  tierSummary,
  windowStatus,
} from '@/admin/sections/accounting/helpers';
import { AccountingPage, JobPhase, WindowStatus } from '@/admin/sections/accounting/types';

import type {
  TAccount,
  TAccountingJob,
  TDiscount,
  TJobReport,
  TLedgerEntry,
  TPrice,
  TPriceTier,
} from '@/admin/sections/accounting/types';

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

describe('describeStatusChange', () => {
  const account = (enabled: boolean, account_type = 'proj') =>
    ({ enabled, account_type }) as TAccount;

  it('counts the accounts it changed', () => {
    expect(describeStatusChange({ accounts: [account(true)], open_job_ids: [] })).toBe(
      'Enabled 1 account'
    );
  });

  it('warns about open jobs that can no longer be charged', () => {
    expect(
      describeStatusChange({ accounts: [account(false), account(false)], open_job_ids: ['j1'] })
    ).toBe("Disabled 2 accounts. 1 open job can't be charged until it's enabled again.");
  });

  it('says nothing about open jobs on an enable', () => {
    expect(describeStatusChange({ accounts: [account(true)], open_job_ids: ['j1'] })).toBe(
      'Enabled 1 account'
    );
  });

  it('leaves reservation accounts out of the count', () => {
    expect(
      describeStatusChange({
        accounts: [account(false), account(false, 'rsv')],
        open_job_ids: [],
      })
    ).toBe('Disabled 1 account');
  });
});

describe('amountField', () => {
  const [required, check] = amountField().rules as Array<{
    required?: boolean;
    validator: (rule: unknown, value: unknown) => Promise<void>;
  }>;

  it('is required unless optional', () => {
    expect(required.required).toBe(true);
    expect((amountField({ optional: true }).rules?.[0] as { required: boolean }).required).toBe(
      false
    );
  });

  it.each(['12', '12.5', '0.01'])('takes %s', async (value) => {
    await expect(check.validator(null, value)).resolves.toBeUndefined();
  });

  it.each(['0', '0.00', '-1', '1e3', '1.005'])('refuses %s', async (value) => {
    await expect(check.validator(null, value)).rejects.toThrow();
  });

  it('leaves an empty optional amount alone', async () => {
    await expect(check.validator(null, null)).resolves.toBeUndefined();
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

describe('decimals', () => {
  it.each([
    ['12.5', -2, '0.125'],
    ['0.0001', -2, '0.000001'],
    ['100', -2, '1'],
    ['0.125', 2, '12.5'],
    ['1', 2, '100'],
    ['0.2', 2, '20'],
    ['007.50', 0, '7.5'],
  ])('shifts %s by %i places to %s', (value, places, shifted) => {
    expect(shiftDecimal(value, places)).toBe(shifted);
  });

  it.each([
    ['1E-7', '0.0000001'],
    ['1.5E+3', '1500'],
    ['0E-8', '0'],
    ['2.5e-1', '0.25'],
    ['0.200000', '0.2'],
  ])('writes %s without an exponent', (value, plain) => {
    expect(plainDecimal(value)).toBe(plain);
  });

  it('turns percents and fractions into each other without float noise', () => {
    expect(percentToFraction('0.0001')).toBe('0.000001');
    expect(fractionToPercent('0.07')).toBe('7');
    expect(fractionToPercent('2E-1')).toBe('20');
    expect(fractionToPercent(percentToFraction('33.3333'))).toBe('33.3333');
  });
});

const DISCOUNT: TDiscount = {
  id: 7,
  vlab_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  discount: '0.2',
  valid_from: '2026-11-10T00:00:00Z',
  valid_to: '2026-11-20T00:00:00Z',
};

describe('windowStatus', () => {
  it.each([
    ['2026-11-09T23:59:59Z', WindowStatus.Scheduled],
    ['2026-11-10T00:00:00Z', WindowStatus.Active],
    ['2026-11-19T23:59:59Z', WindowStatus.Active],
    ['2026-11-20T00:00:00Z', WindowStatus.Expired],
  ])('at %s is %s, with the start in and the end out', (now, status) => {
    expect(windowStatus(DISCOUNT, new Date(now))).toBe(status);
  });

  it('never ends without an end', () => {
    expect(windowStatus({ ...DISCOUNT, valid_to: null }, new Date('2099-01-01'))).toBe(
      WindowStatus.Active
    );
  });
});

describe('discountUpdate', () => {
  const untouched = {
    percent: '20',
    valid_from: '2026-11-10T00:00:00Z',
    valid_to: '2026-11-20T00:00:00Z',
  };

  it('sends nothing when nothing changed, even as 0.200000 or 2E-1', () => {
    expect(discountUpdate(DISCOUNT, untouched)).toEqual({});
    expect(discountUpdate({ ...DISCOUNT, discount: '2E-1' }, untouched)).toEqual({});
    expect(discountUpdate({ ...DISCOUNT, discount: '0.200000' }, untouched)).toEqual({});
  });

  it('sends only what changed', () => {
    expect(discountUpdate(DISCOUNT, { ...untouched, percent: '25' })).toEqual({
      discount: '0.25',
    });
  });

  it('clears the end with an explicit null', () => {
    expect(discountUpdate(DISCOUNT, { ...untouched, valid_to: undefined })).toEqual({
      valid_to: null,
    });
  });

  it('sends only the end of a started discount', () => {
    expect(discountUpdate(DISCOUNT, { valid_to: '2026-12-01T00:00:00.000Z' })).toEqual({
      valid_to: '2026-12-01T00:00:00.000Z',
    });
  });
});

describe('accountLinks', () => {
  it('links a lab to its discounts, and a project to none', () => {
    const lab = { id: DISCOUNT.vlab_id, account_type: 'vlab' } as TAccount;
    expect(accountLinks(lab).map((link) => link.label)).toContain('Discounts');
    expect(accountLinks({ ...lab, account_type: 'proj' }).map((link) => link.label)).not.toContain(
      'Discounts'
    );
  });
});

describe('percentField', () => {
  const check = (value: string, stored?: string) => {
    const [, rule] = percentField(stored).rules as Array<{
      validator: (_: unknown, v: string) => Promise<void>;
    }>;
    return rule.validator(null, value);
  };

  it('takes up to 4 decimals and refuses more, or over 100', async () => {
    await expect(check('12.5')).resolves.toBeUndefined();
    await expect(check('12.34567')).rejects.toThrow();
    await expect(check('100.5')).rejects.toThrow();
  });

  it('lets an untouched stored share through, so the dates can still change', async () => {
    await expect(check('12.34567', '12.34567')).resolves.toBeUndefined();
  });
});

const tier = (min: number, max: number | null, multiplier: string, fixed = '0'): TPriceTier => ({
  min_quantity: min,
  max_quantity: max,
  fixed_cost: fixed,
  multiplier,
});

describe('tierCost', () => {
  it("follows accounting's documented examples", () => {
    const steps = [tier(0, 20, '0', '5'), tier(20, null, '0', '45')];
    expect(tierCost(steps, BigInt(20))).toBe('5.00');
    expect(tierCost(steps, BigInt(21))).toBe('50.00');
    const volume = [tier(0, 1000, '0.10'), tier(1000, null, '0.05')];
    expect(tierCost(volume, BigInt(1500))).toBe('125.00');
    expect(tierCost(volume, BigInt(0))).toBe('0.00');
  });

  it('prices a month of storage from a per byte-second rate, with no float loss', () => {
    const gibMonth = BigInt(2 ** 30) * BigInt(30 * 24 * 3600);
    expect(tierCost([tier(0, null, '8.873E-18')], gibMonth * BigInt(100))).toBe('2.47');
  });

  it('reads at most 30 decimals of a stored figure', () => {
    expect(tierCost([tier(0, null, `0.${'0'.repeat(29)}19`)], BigInt(`1${'0'.repeat(30)}`))).toBe(
      '1.00'
    );
  });

  it('rounds half up to cents', () => {
    expect(tierCost([tier(0, null, '0.005')], BigInt(1))).toBe('0.01');
    expect(tierCost([tier(0, null, '0.0049')], BigInt(1))).toBe('0.00');
  });
});

const PRICE: TPrice = {
  id: 3,
  service_type: 'oneshot',
  service_subtype: 'ml-llm',
  vlab_id: null,
  valid_from: '2026-11-10T00:00:00Z',
  valid_to: null,
  tiers: [tier(0, 100, '1E-7', '2'), tier(100, null, '0.05')],
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('checkPriceEdit', () => {
  const START = '2030-01-01T00:00:00.000Z';
  const at = (hours: number) => new Date(Date.parse(START) + hours * 3_600_000).toISOString();
  const scheduled: TPrice = { ...PRICE, id: 2, vlab_id: 'lab', valid_from: START };

  it('refuses a later start when a list has more prices than it read', () => {
    expect(() =>
      checkPriceEdit({ lists: [[scheduled]], truncated: true }, scheduled, {
        ...scheduled,
        valid_from: at(2),
      })
    ).toThrow(/too many prices/);
  });

  it('still lets the end move on a list with more prices than it read', () => {
    const following: TPrice = { ...scheduled, id: 3, valid_from: at(1) };

    expect(() =>
      checkPriceEdit({ lists: [[following, scheduled]], truncated: true }, scheduled, {
        ...scheduled,
        valid_to: at(2),
      })
    ).not.toThrow();
  });

  it("refuses a later start past the end of the default before a lab's price", () => {
    const fallback: TPrice = {
      ...PRICE,
      id: 1,
      valid_from: '2026-01-01T00:00:00Z',
      valid_to: at(1),
    };

    expect(() =>
      checkPriceEdit({ lists: [[scheduled], [fallback]], truncated: false }, scheduled, {
        ...scheduled,
        valid_from: at(2),
      })
    ).toThrow(/No other price would apply/);
  });
});

describe('price form values', () => {
  it('saves an untouched price with the same figures, written without exponents', () => {
    expect(priceBody(priceValues(PRICE), null)).toEqual({
      service_type: 'oneshot',
      service_subtype: 'ml-llm',
      valid_from: PRICE.valid_from,
      valid_to: null,
      vlab_id: null,
      tiers: [tier(0, 100, '0.0000001', '2'), tier(100, null, '0.05')],
    });
  });

  it('chains tiers from the form and keeps storage to its rate', () => {
    const body = priceBody(
      {
        service_type: 'storage',
        service_subtype: 'storage',
        tiers: [{ multiplier: '0.1', fixed_cost: '3' }],
      },
      'lab'
    );
    expect(body.tiers).toEqual([tier(0, null, '0.1')]);
    expect(body.vlab_id).toBe('lab');
  });
});

describe('priceAt', () => {
  const older = { ...PRICE, id: 1, valid_from: '2026-11-01T00:00:00Z' };
  const newer = {
    ...PRICE,
    id: 2,
    valid_from: '2026-11-05T00:00:00Z',
    valid_to: '2026-11-08T00:00:00Z',
  };
  const list = [newer, older];

  it('takes the one that started last among those in their dates', () => {
    expect(priceAt(list, new Date('2026-11-06'))?.id).toBe(2);
    expect(priceAt(list, new Date('2026-11-08'))?.id).toBe(1);
    expect(priceAt(list, new Date('2026-10-01'))).toBeUndefined();
  });

  it('leaves out the price being ended', () => {
    expect(priceAt(list, new Date('2026-11-06'), 2)?.id).toBe(1);
    expect(priceAt(list, new Date('2026-11-06'), 1)?.id).toBe(2);
  });
});

describe('price labels', () => {
  it('shows a dash for a price with no tiers', () => {
    expect(tierSummary({ ...PRICE, tiers: [] })).toBe('—');
  });

  it('summarizes one tier or counts several', () => {
    expect(tierSummary(PRICE)).toBe('2 tiers');
    expect(tierSummary({ ...PRICE, tiers: [tier(0, null, '0.05', '1')] })).toBe(
      '1 + 0.05 per unit'
    );
    expect(tierSummary({ service_type: 'storage', tiers: [tier(0, null, '1E-7')] })).toBe(
      '0.0000001 per byte-second'
    );
  });

  it('reads a zero fixed cost in exponent form as zero', () => {
    expect(tierSummary({ ...PRICE, tiers: [tier(0, null, '0.05', '0E-8')] })).toBe('0.05 per unit');
  });

  it("shows and costs storage by its first tier's rate, as accounting charges it", () => {
    const storage = {
      service_type: 'storage' as const,
      tiers: [tier(0, 10, '1', '5'), tier(10, null, '2')],
    };
    expect(tierSummary(storage)).toBe('1 per byte-second');
    expect(tierCost(chargedTiers(storage), BigInt(20))).toBe('20.00');
  });

  it("keys a lab's prices by the lab and the default by only_default", () => {
    expect(priceKey(PRICE)).toEqual({
      service_type: 'oneshot',
      service_subtype: 'ml-llm',
      only_default: true,
    });
    expect(priceKey({ ...PRICE, vlab_id: 'lab' })).toMatchObject({ vlab_id: 'lab' });
  });
});
