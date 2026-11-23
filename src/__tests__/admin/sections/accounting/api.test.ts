import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
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
  reportPath,
  reverseBudget,
  setAccountEnabled,
  topUp,
} from '@/admin/sections/accounting/api';
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
});

describe('reportPath', () => {
  it('prefers the project, then the lab, then the whole system', () => {
    expect(reportPath({ vlabId: 'v', projectId: 'p' })).toBe('report/project/p');
    expect(reportPath({ vlabId: 'v' })).toBe('report/virtual-lab/v');
    expect(reportPath({})).toBe('report/system');
  });
});
