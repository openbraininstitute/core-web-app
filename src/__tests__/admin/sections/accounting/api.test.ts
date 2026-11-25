import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertPriceEdit,
  assertPriceEnd,
  assignBudget,
  depleteProject,
  depleteVlab,
  getAccount,
  getJob,
  getSystemBalance,
  grantBudget,
  listJobs,
  listJournal,
  listProjectAccounts,
  listReport,
  listVlabAccounts,
  moveBudget,
  refundJob,
  replacePrice,
  reportPath,
  reverseBudget,
  setAccountEnabled,
  topUp,
} from '@/admin/sections/accounting/api';
import { closesDialog, isOutcomeUnknown, isPartlyDone } from '@/admin/sections/accounting/helpers';
import {
  AccountingSubtype,
  ChargeType,
  JobStatusFilter,
  TransactionType,
} from '@/admin/sections/accounting/types';
import { matchAccountingRoute } from '@/admin/server/accounting-proxy';
import { isForbidden } from '@/admin/shared/errors';
import { ApiError } from '@/api/error';

import type {
  TJobFilters,
  TJournalFilters,
  TPrice,
  TPriceBody,
  TReportFilters,
  TVlabAccountFilters,
} from '@/admin/sections/accounting/types';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('accounting client', () => {
  it('calls the proxy without empty filters and unwraps a page', async () => {
    fetchMock.mockResolvedValue(
      json({
        message: 'ok',
        data: {
          items: [{ id: 'j1' }],
          meta: { page: 1, page_size: 20, total_pages: 1, total_items: 1 },
        },
      })
    );

    const page = await listJobs({ page: 1, page_size: 20, status: undefined, vlab_id: 'v1' });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/admin/accounting/admin/job?page=1&page_size=20&vlab_id=v1'
    );
    expect(page).toEqual({ data: [{ id: 'j1' }], pagination: { total: 1 } });
  });

  it("throws the proxy's message, keeping a denial a 403", async () => {
    fetchMock.mockResolvedValue(json({ message: "Your account isn't allowed to do this" }, 403));

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(isForbidden(error)).toBe(true);
  });

  it('keeps an unreachable service apart from a denial', async () => {
    fetchMock.mockResolvedValue(
      json({ message: "Accounting isn't reachable from this environment." }, 502)
    );

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(isForbidden(error)).toBe(false);
    expect(error.message).toBe("Accounting isn't reachable from this environment.");
  });
  it('throws a readable error for a success reply it cannot read', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"trunc', { headers: { 'content-type': 'application/json' } })
    );

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.cause?.status).toBe(200);
  });
  it('throws a readable error when a success reply carries no data', async () => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Accounting sent a reply with no data.');
  });
});

describe('client requests and the proxy allowlist', () => {
  const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const PAGE = { page: 1, page_size: 20 };
  const DAY = '2026-11-01T00:00:00.000Z';
  const vlabFilters: Required<TVlabAccountFilters> = { name: 'lab', enabled: true };
  const jobFilters: Required<TJobFilters> = {
    vlab_id: ID,
    proj_id: ID,
    service_type: ChargeType.Oneshot,
    service_subtype: AccountingSubtype.SingleCellSim,
    status: JobStatusFilter.Finished,
    started_after: DAY,
    started_before: DAY,
  };
  const journalFilters: Required<TJournalFilters> = {
    account_id: ID,
    job_id: ID,
    transaction_type: TransactionType.ChargeOneshot,
    transaction_after: DAY,
    transaction_before: DAY,
  };
  const reportFilters: Required<TReportFilters> = { started_after: DAY, started_before: DAY };

  const calls: Array<[string, () => Promise<unknown>]> = [
    ['listVlabAccounts', () => listVlabAccounts({ ...vlabFilters, ...PAGE })],
    ['listProjectAccounts', () => listProjectAccounts({ vlabId: ID, ...PAGE })],
    ['getAccount', () => getAccount(ID)],
    ['listJobs', () => listJobs({ ...jobFilters, ...PAGE })],
    ['getJob', () => getJob(ID)],
    ['listJournal', () => listJournal({ ...journalFilters, ...PAGE })],
    ['getSystemBalance', () => getSystemBalance()],
    ...[{}, { vlabId: ID }, { projectId: ID }].map((scope): [string, () => Promise<unknown>] => [
      `listReport ${reportPath(scope)}`,
      () => listReport({ path: reportPath(scope), ...reportFilters, ...PAGE }),
    ]),
  ];

  it.each(calls)('%s sends only what the proxy forwards', async (_, call) => {
    fetchMock.mockResolvedValue(
      json({ message: 'ok', data: { items: [], meta: { total_items: 0 } } })
    );

    await call();

    const url = new URL(fetchMock.mock.calls[0][0], 'http://x');
    const path = url.pathname.replace('/api/admin/accounting/', '');
    expect(matchAccountingRoute(path.split('/'), url.searchParams)).not.toHaveProperty('status');
  });
});

describe('client writes and the proxy allowlist', () => {
  const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const OTHER = '9b2f1c4e-0d3a-4e5f-8a6b-7c8d9e0f1a2b';
  const writes: Array<[string, () => Promise<unknown>]> = [
    ['setAccountEnabled', () => setAccountEnabled(ID, { enabled: false })],
    ['refundJob', () => refundJob({ job_id: ID, amount: '1.5', reason: 'Failed run' })],
    ['refundJob in full', () => refundJob({ job_id: ID, reason: 'Failed run' })],
    ['topUp', () => topUp({ vlab_id: ID, amount: '100' })],
    ['assignBudget', () => assignBudget({ vlab_id: ID, proj_id: OTHER, amount: '10' })],
    ['reverseBudget', () => reverseBudget({ vlab_id: ID, proj_id: OTHER, amount: '10' })],
    [
      'moveBudget',
      () => moveBudget({ vlab_id: ID, debited_from: OTHER, credited_to: ID, amount: '10' }),
    ],
    ['grantBudget', () => grantBudget({ proj_id: ID, amount: '10' })],
    ['depleteProject', () => depleteProject({ proj_id: ID })],
    ['depleteVlab', () => depleteVlab({ vlab_id: ID })],
  ];

  it.each(writes)('%s sends what the proxy forwards, as the admin pages do', async (_, call) => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));

    await call();

    const [path, init] = fetchMock.mock.calls[0];
    const url = new URL(path, 'http://x');
    const target = matchAccountingRoute(
      url.pathname.replace('/api/admin/accounting/', '').split('/'),
      url.searchParams,
      init.method
    );
    expect(target).not.toHaveProperty('status');
    expect('body' in target && target.body?.safeParse(JSON.parse(init.body)).success).toBe(true);
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-admin-request': '1',
    });
  });

  it("throws accounting's reason for a refused write", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error_code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in the virtual-lab account',
          details: null,
        },
        400
      )
    );

    const error = await assignBudget({ vlab_id: ID, proj_id: OTHER, amount: '10' }).catch(
      (caught) => caught
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Insufficient funds in the virtual-lab account');
  });

  it.each([
    ['the connection drops', () => fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))],
    [
      'a gateway answers with a page',
      () =>
        fetchMock.mockResolvedValue(
          new Response('<html/>', { status: 502, headers: { 'content-type': 'text/html' } })
        ),
    ],
    [
      'the proxy says so',
      () =>
        fetchMock.mockResolvedValue(
          json(
            {
              message: "Accounting didn't answer, so this change may or may not have gone through.",
              error_code: 'OUTCOME_UNKNOWN',
            },
            502
          )
        ),
    ],
  ])('says the outcome is unknown when %s', async (_, arrange) => {
    arrange();

    const error = await topUp({ vlab_id: ID, amount: '10' }).catch((caught) => caught);

    expect(error.message).toMatch(/may or may not have gone through/);
    expect(isOutcomeUnknown(error)).toBe(true);
  });
});

describe('reportPath', () => {
  it('prefers the project, then the lab, then the whole system', () => {
    expect(reportPath({ vlabId: 'v', projectId: 'p' })).toBe('report/project/p');
    expect(reportPath({ vlabId: 'v' })).toBe('report/virtual-lab/v');
    expect(reportPath({})).toBe('report/system');
  });
});

const OLD: TPrice = {
  id: 3,
  service_type: 'oneshot',
  service_subtype: 'ml-llm',
  vlab_id: null,
  valid_from: '2026-01-01T00:00:00Z',
  valid_to: null,
  tiers: [{ min_quantity: 0, max_quantity: null, fixed_cost: '0', multiplier: '0.1' }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const START = new Date(Date.now() + 3_600_000).toISOString();
const NEXT: TPriceBody = {
  service_type: 'oneshot',
  service_subtype: 'ml-llm',
  vlab_id: null,
  valid_from: START,
  valid_to: null,
  tiers: OLD.tiers,
};
const CREATED: TPrice = { ...OLD, id: 9, valid_from: START };

const page = (items: TPrice[]) =>
  json({
    message: 'ok',
    data: { items, meta: { page: 1, page_size: 100, total_pages: 1, total_items: items.length } },
  });

// Answers by method and path; `listed` is what the price list returns.
function accounting({
  listed = [CREATED, OLD],
  create = () => json({ message: 'Price added', data: CREATED }, 201),
  expire = () => json({ message: 'Price expired', data: OLD }),
}: {
  listed?: TPrice[];
  create?: () => Response | Promise<Response>;
  expire?: () => Response | Promise<Response>;
} = {}) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('/expire')) return expire();
    if (init?.method === 'POST') return create();
    return page(listed);
  });
}

const posted = (part: string) =>
  fetchMock.mock.calls.filter(([url, init]) => url.includes(part) && init?.method === 'POST');

describe('replacePrice', () => {
  it('ends the old price when the new one starts, once the new one is listed', async () => {
    accounting();

    await expect(replacePrice(OLD, NEXT)).resolves.toEqual(CREATED);

    const [[url, init]] = posted('/expire');
    expect(url).toBe('/api/admin/accounting/admin/price/3/expire');
    expect(JSON.parse(init.body)).toEqual({ valid_to: START });
  });

  it('stops before ending anything when the new price may not exist', async () => {
    accounting({ create: () => Promise.reject(new TypeError('Failed to fetch')) });

    const error = await replacePrice(OLD, NEXT).catch((caught) => caught);

    expect(isOutcomeUnknown(error)).toBe(true);
    expect(posted('/expire')).toEqual([]);
  });

  it('does not end the old price when the new one is not listed yet', async () => {
    accounting({ listed: [OLD] });

    const error = await replacePrice(OLD, NEXT).catch((caught) => caught);

    expect(closesDialog(error)).toBe(true);
    expect(error.message).toMatch(/#9 was added but isn't listed yet/);
    expect(posted('/expire')).toEqual([]);
  });

  it('says the new price is in when the old one could not be ended', async () => {
    accounting({ expire: () => json({ message: 'Price already expired.' }, 400) });

    const error = await replacePrice(OLD, NEXT).catch((caught) => caught);

    expect(closesDialog(error)).toBe(true);
    expect(error.message).toMatch(
      /#9 was added, but this one couldn't be ended: Price already expired\. The new one/
    );
  });

  it('says the old price may have ended when its end gets no reply', async () => {
    accounting({
      expire: () =>
        new Response('<html/>', { status: 502, headers: { 'content-type': 'text/html' } }),
    });

    const error = await replacePrice(OLD, NEXT).catch((caught) => caught);

    expect(isPartlyDone(error)).toBe(true);
    expect(error.message).toMatch(/#9 was added, but no reply came about ending this one/);
  });

  it('refuses a new price with an end that nothing follows, before adding it', async () => {
    accounting({ listed: [OLD] });

    const error = await replacePrice(OLD, {
      ...NEXT,
      valid_to: new Date(Date.now() + 7_200_000).toISOString(),
    }).catch((caught) => caught);

    expect(error.message).toMatch(/No other price would apply/);
    expect(closesDialog(error)).toBe(false);
    expect(posted('admin/price')).toEqual([]);
  });

  it('replaces a price that ends with nothing after it, keeping its end', async () => {
    const end = new Date(Date.now() + 5 * 3_600_000).toISOString();
    const ending: TPrice = { ...OLD, valid_to: end };
    const created: TPrice = { ...CREATED, valid_to: end };
    accounting({
      listed: [created, ending],
      create: () => json({ message: 'Price added', data: created }, 201),
    });

    await expect(replacePrice(ending, { ...NEXT, valid_to: end })).resolves.toEqual(created);
    expect(posted('/expire')).toHaveLength(1);
  });

  it('refuses a new price whose end hands over to a price that lapses before the old end', async () => {
    const lapsing: TPrice = {
      ...OLD,
      id: 5,
      valid_from: '2025-01-01T00:00:00Z',
      valid_to: new Date(Date.now() + 5 * 3_600_000).toISOString(),
    };
    accounting({ listed: [OLD, lapsing] });

    const error = await replacePrice(OLD, {
      ...NEXT,
      valid_to: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    }).catch((caught) => caught);

    expect(error.message).toMatch(/No other price would apply/);
    expect(posted('admin/price')).toEqual([]);
  });
});

describe('assertPriceEnd', () => {
  const end = new Date(Date.now() + 3_600_000).toISOString();

  it('lets a lab price end into the default', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      page(url.includes('only_default=true') ? [OLD] : [])
    );

    await expect(assertPriceEnd({ ...OLD, id: 4, vlab_id: 'lab' }, end)).resolves.toBeUndefined();
  });

  it('refuses to end the only default price', async () => {
    fetchMock.mockResolvedValue(page([OLD]));

    await expect(assertPriceEnd(OLD, end)).rejects.toThrow(/No other price would apply/);
  });

  it('checks nothing for a price with no end', async () => {
    await expect(assertPriceEnd(OLD, null)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('price start and end checks', () => {
  it('refuses a replacement about to start, before adding anything', async () => {
    accounting();

    const error = await replacePrice(OLD, {
      ...NEXT,
      valid_from: new Date(Date.now() + 30_000).toISOString(),
    }).catch((caught) => caught);

    expect(error.message).toMatch(/within a minute/);
    expect(closesDialog(error)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to start a replacement after the price it replaces has ended', async () => {
    accounting();
    const ending = { ...OLD, valid_to: new Date(Date.now() + 1_800_000).toISOString() };

    const error = await replacePrice(ending, NEXT).catch((caught) => caught);

    expect(error.message).toMatch(/Start the new one by then/);
    expect(posted('admin/price')).toEqual([]);
  });

  it('refuses a later start that leaves a gap after the price before it', async () => {
    const before = { ...OLD, id: 1, valid_from: '2026-01-01T00:00:00Z', valid_to: START };
    const scheduled = { ...OLD, id: 2, valid_from: START };
    fetchMock.mockImplementation(async () => page([scheduled, before]));
    const later = new Date(Date.parse(START) + 7_200_000).toISOString();

    await expect(assertPriceEdit(scheduled, { ...scheduled, valid_from: later })).rejects.toThrow(
      /No other price would apply/
    );
  });

  it('refuses a later start that leaves a gap before the next price starts', async () => {
    const at = (hours: number) => new Date(Date.parse(START) + hours * 3_600_000).toISOString();
    const before = { ...OLD, id: 1, valid_from: '2026-01-01T00:00:00Z', valid_to: START };
    const scheduled = { ...OLD, id: 2, valid_from: START, valid_to: null };
    const following = { ...OLD, id: 3, valid_from: at(1), valid_to: null };
    fetchMock.mockImplementation(async () => page([following, scheduled, before]));

    await expect(assertPriceEdit(scheduled, { ...scheduled, valid_from: at(2) })).rejects.toThrow(
      /No other price would apply/
    );
  });

  it('lets an edit keep an end it does not move', async () => {
    const scheduled = { ...OLD, id: 2, valid_from: START, valid_to: '2030-01-01T00:00:00Z' };

    await expect(
      assertPriceEdit(scheduled, { ...scheduled, valid_to: '2030-01-01T00:00:00.000Z' })
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets a first price start later, since nothing applied before it', async () => {
    const scheduled = { ...OLD, id: 2, valid_from: START };
    fetchMock.mockImplementation(async () => page([scheduled]));

    await expect(
      assertPriceEdit(scheduled, {
        ...scheduled,
        valid_from: new Date(Date.parse(START) + 7_200_000).toISOString(),
      })
    ).resolves.toBeUndefined();
  });
});
