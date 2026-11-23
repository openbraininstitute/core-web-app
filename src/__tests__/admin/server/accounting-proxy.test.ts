import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forwardToAccounting, matchAccountingRoute } from '@/admin/server/accounting-proxy';

const { serverConfig } = vi.hoisted(() => ({
  serverConfig: { ACCOUNTING_URL: 'https://cell-a/api/accounting/' as string | undefined },
}));

vi.mock('@/config/server', () => ({ serverConfig }));

const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const PAGE = 'page=1&page_size=20';

const match = (path: string, query = '') =>
  matchAccountingRoute(path.split('/'), new URLSearchParams(query));

describe('matchAccountingRoute', () => {
  it.each([
    ['admin/account/virtual-lab', `name=lab&enabled=true&${PAGE}`],
    [`admin/account/virtual-lab/${ID}/project`, PAGE],
    [`admin/account/${ID}`, ''],
    ['admin/journal', `account_id=${ID}&transaction_type=top-up&${PAGE}`],
    ['admin/job', `status=open&started_after=2026-11-01T00:00:00.000Z&${PAGE}`],
    [`admin/job/${ID}`, ''],
    ['balance/system', ''],
    ['report/system', PAGE],
    [`report/virtual-lab/${ID}`, PAGE],
    [`report/project/${ID}`, PAGE],
  ])('forwards GET %s', (path, query) => {
    expect(match(path, query)).toEqual({
      path,
      search: new URLSearchParams(query),
    });
  });

  it.each([
    'account/virtual-lab',
    'budget/top-up',
    'usage/oneshot',
    'reservation/oneshot',
    'estimate/oneshot',
    'job/longrun/open',
    'admin/price',
    'admin/refund',
    `balance/virtual-lab/${ID}`,
    'admin/job/not-a-uuid',
    `admin/job/${ID}/extra`,
    'health',
  ])('refuses %s', (path) => {
    expect(match(path, PAGE)).toMatchObject({ status: 404 });
  });

  it.each([
    ['..', 'admin', 'job'],
    ['admin', '', 'job'],
    ['admin', 'job%2F..'],
    ['admin', 'job?x=1'],
    [],
  ])('refuses unsafe segments %j', (...segments) => {
    expect(matchAccountingRoute(segments, new URLSearchParams(PAGE))).toMatchObject({
      status: 404,
    });
  });

  it('refuses a query parameter the route does not take', () => {
    expect(match('admin/job', `${PAGE}&order_by=id`)).toMatchObject({ status: 400 });
    expect(match(`admin/job/${ID}`, 'expand=journal')).toMatchObject({ status: 400 });
  });

  it('refuses a query parameter with no name', () => {
    expect(match(`admin/job/${ID}`, '=x')).toMatchObject({ status: 400 });
  });

  it('refuses a repeated query parameter', () => {
    expect(match('admin/job', `${PAGE}&status=open&status=finished`)).toMatchObject({
      status: 400,
    });
  });

  it.each([
    '',
    'page=1',
    'page_size=0',
    'page_size=101',
    'page_size=1e2',
    'page=0&page_size=20',
    'page=-1&page_size=20',
    'page=1000001&page_size=20',
  ])('needs a bounded page size on a paged route: %s', (query) => {
    expect(match('admin/journal', query)).toMatchObject({ status: 400 });
  });
});

const fetchMock = vi.fn();
const OPEN = new AbortController().signal;

beforeEach(() => {
  fetchMock.mockReset();
  serverConfig.ACCOUNTING_URL = 'https://cell-a/api/accounting/';
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('forwardToAccounting', () => {
  it('passes the service reply through, uncached', async () => {
    const body = { message: 'ok', data: { balance: '10.00' } };
    fetchMock.mockResolvedValue(json(body));

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cell-a/api/accounting/balance/system',
      expect.objectContaining({ redirect: 'manual', cache: 'no-store' })
    );
    expect(reply.status).toBe(200);
    expect(reply.headers.get('cache-control')).toBe('private, no-store');
    await expect(reply.json()).resolves.toEqual(body);
  });

  it('keeps the query string', async () => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));
    await forwardToAccounting('admin/job', new URLSearchParams(PAGE), OPEN);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://cell-a/api/accounting/admin/job?${PAGE}`);
  });

  it("passes accounting's own errors through", async () => {
    const body = { error_code: 'ENTITY_NOT_FOUND', message: 'Job not found', details: null };
    fetchMock.mockResolvedValue(json(body, 404));

    const reply = await forwardToAccounting(`admin/job/${ID}`, new URLSearchParams(), OPEN);

    expect(reply.status).toBe(404);
    await expect(reply.json()).resolves.toEqual(body);
  });

  it.each([
    ['a gateway JSON 403', () => json({ message: 'Forbidden' }, 403)],
    ['a 401', () => json({ message: 'Unauthorized' }, 401)],
    ['a redirect', () => new Response(null, { status: 302, headers: { location: '/' } })],
    ['an HTML page', () => new Response('<html/>', { headers: { 'content-type': 'text/html' } })],
  ])('reads %s as not reachable, never as a denial', async (_, upstream) => {
    fetchMock.mockResolvedValue(upstream());

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);

    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({
      message: "Accounting isn't reachable from this environment.",
    });
  });

  it('reports an unreadable gateway failure', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html/>', { status: 504, headers: { 'content-type': 'text/html' } })
    );
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);
    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({ message: 'Accounting failed with status 504.' });
  });

  it('says accounting did not answer when the body never finishes', async () => {
    const stalled = new Response('{}', { headers: { 'content-type': 'application/json' } });
    vi.spyOn(stalled, 'text').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    fetchMock.mockResolvedValue(stalled);

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);

    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({ message: "Accounting didn't answer." });
  });

  it('passes a reply with no body through', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 204, headers: { 'content-type': 'application/json' } })
    );
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);
    expect(reply.status).toBe(204);
  });

  it('stops waiting on accounting when the caller goes away', async () => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));
    const caller = new AbortController();
    caller.abort();

    await forwardToAccounting('balance/system', new URLSearchParams(), caller.signal);

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('says when accounting does not answer', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);
    expect(reply.status).toBe(502);
  });

  it('says when the URL is not configured, without calling out', async () => {
    serverConfig.ACCOUNTING_URL = undefined;
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), OPEN);
    expect(reply.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
