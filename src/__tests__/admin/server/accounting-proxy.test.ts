import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RefundBody, TopUpBody } from '@/admin/sections/accounting/schemas';
import {
  forwardAccountingWrite,
  forwardToAccounting,
  isAdminPageWrite,
  matchAccountingRoute,
  readWriteBody,
} from '@/admin/server/accounting-proxy';

import type { MockInstance } from 'vitest';

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
    'usage/oneshot',
    'reservation/oneshot',
    'estimate/oneshot',
    'job/longrun/open',
    'admin/price',
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

  it.each([
    ['POST', `admin/account/${ID}`],
    ['PATCH', 'budget/top-up'],
    ['PUT', `admin/account/${ID}`],
    ['DELETE', `admin/account/${ID}`],
    ['GET', 'budget/top-up'],
    ['GET', 'admin/refund'],
  ])('refuses %s on %s, a known path that takes another method', (method, path) => {
    expect(matchAccountingRoute(path.split('/'), new URLSearchParams(), method)).toMatchObject({
      status: 405,
    });
  });

  it.each([
    'account/virtual-lab',
    'account/project',
    'reservation/oneshot',
    'reservation/longrun',
    'usage/oneshot',
    'usage/longrun',
    'estimate/oneshot',
    'admin/price',
    'admin/discount',
  ])('refuses POST %s, which belongs to other services or a later change', (path) => {
    expect(matchAccountingRoute(path.split('/'), new URLSearchParams(), 'POST')).toMatchObject({
      status: 404,
    });
  });

  it('refuses a query on a write', () => {
    expect(
      matchAccountingRoute(['budget', 'top-up'], new URLSearchParams('vlab_id=x'), 'POST')
    ).toMatchObject({ status: 400 });
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

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });

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
    await forwardToAccounting('admin/job', new URLSearchParams(PAGE), { signal: OPEN });
    expect(fetchMock.mock.calls[0][0]).toBe(`https://cell-a/api/accounting/admin/job?${PAGE}`);
  });

  it("passes accounting's own errors through", async () => {
    const body = { error_code: 'ENTITY_NOT_FOUND', message: 'Job not found', details: null };
    fetchMock.mockResolvedValue(json(body, 404));

    const reply = await forwardToAccounting(`admin/job/${ID}`, new URLSearchParams(), {
      signal: OPEN,
    });

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

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });

    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({
      message: "Accounting isn't reachable from this environment.",
    });
  });

  it('reports an unreadable gateway failure', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html/>', { status: 504, headers: { 'content-type': 'text/html' } })
    );
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });
    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({ message: 'Accounting failed with status 504.' });
  });

  it('says accounting did not answer when the body never finishes', async () => {
    const stalled = new Response('{}', { headers: { 'content-type': 'application/json' } });
    vi.spyOn(stalled, 'text').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    fetchMock.mockResolvedValue(stalled);

    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });

    expect(reply.status).toBe(502);
    await expect(reply.json()).resolves.toEqual({ message: "Accounting didn't answer." });
  });

  it('passes a reply with no body through', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 204, headers: { 'content-type': 'application/json' } })
    );
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });
    expect(reply.status).toBe(204);
  });

  it('stops waiting on accounting when the caller goes away', async () => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));
    const caller = new AbortController();
    caller.abort();

    await forwardToAccounting('balance/system', new URLSearchParams(), { signal: caller.signal });

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('says when accounting does not answer', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });
    expect(reply.status).toBe(502);
  });

  it('says when the URL is not configured, without calling out', async () => {
    serverConfig.ACCOUNTING_URL = undefined;
    const reply = await forwardToAccounting('balance/system', new URLSearchParams(), {
      signal: OPEN,
    });
    expect(reply.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const adminHeaders = (overrides: Record<string, string | null> = {}) => {
  const headers = new Headers({
    'sec-fetch-site': 'same-origin',
    'x-admin-request': '1',
    'content-type': 'application/json; charset=utf-8',
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) headers.delete(key);
    else headers.set(key, value);
  }
  return headers;
};

describe('isAdminPageWrite', () => {
  it('lets a write from the admin pages through', () => {
    expect(isAdminPageWrite(adminHeaders())).toBe(true);
  });

  it.each([
    ['from another site', { 'sec-fetch-site': 'cross-site' }],
    ['from a sibling subdomain', { 'sec-fetch-site': 'same-site' }],
    ['with no fetch metadata', { 'sec-fetch-site': null }],
    ['without the admin header', { 'x-admin-request': null }],
    ['as a form post', { 'content-type': 'application/x-www-form-urlencoded' }],
    ['as plain text', { 'content-type': 'text/plain' }],
  ])('refuses a write %s', (_, overrides) => {
    expect(isAdminPageWrite(adminHeaders(overrides))).toBe(false);
  });
});

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/x', { method: 'POST', body, headers });

describe('readWriteBody', () => {
  it('keeps only what the schema reads', async () => {
    const body = JSON.stringify({ vlab_id: ID, amount: '12.50' });
    await expect(readWriteBody(post(body), TopUpBody)).resolves.toEqual({
      value: { vlab_id: ID, amount: '12.50' },
    });
  });

  it.each([
    ['an extra field', { vlab_id: ID, amount: '1', proj_id: ID }],
    ['a number amount', { vlab_id: ID, amount: 12.5 }],
    ['a zero amount', { vlab_id: ID, amount: '0.00' }],
    ['a negative amount', { vlab_id: ID, amount: '-1' }],
    ['too many decimals', { vlab_id: ID, amount: '1.005' }],
    ['an exponent', { vlab_id: ID, amount: '1e3' }],
    ['a bad id', { vlab_id: 'lab', amount: '1' }],
    ['a missing field', { amount: '1' }],
    ['an array', [ID, '1']],
  ])('refuses %s', async (_, body) => {
    await expect(readWriteBody(post(JSON.stringify(body)), TopUpBody)).resolves.toMatchObject({
      status: 400,
    });
  });

  it('refuses a body that is not JSON', async () => {
    await expect(readWriteBody(post('amount=1'), TopUpBody)).resolves.toMatchObject({
      status: 400,
    });
  });

  it('refuses a body over the size cap', async () => {
    const reason = 'x'.repeat(5000);
    await expect(
      readWriteBody(post(JSON.stringify({ job_id: ID, reason })), RefundBody)
    ).resolves.toMatchObject({ status: 413 });
  });

  it('needs a reason for a refund', async () => {
    await expect(
      readWriteBody(post(JSON.stringify({ job_id: ID, reason: '  ' })), RefundBody)
    ).resolves.toMatchObject({ status: 400 });
  });

  it('refuses a streamed body over the cap without a content length', async () => {
    const big = new TextEncoder().encode(JSON.stringify({ job_id: ID, reason: 'x'.repeat(5000) }));
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(big);
        controller.close();
      },
    });
    const request = new Request('http://localhost/x', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);

    await expect(readWriteBody(request, RefundBody)).resolves.toMatchObject({ status: 413 });
  });

  it('refuses a __proto__ key instead of dropping it', async () => {
    const body = `{"vlab_id":"${ID}","amount":"1","__proto__":{"admin":true}}`;
    await expect(readWriteBody(post(body), TopUpBody)).resolves.toMatchObject({ status: 400 });
  });
});

describe('forwardAccountingWrite', () => {
  const operator = { id: 'sub-1', username: 'op' };
  const body = { vlab_id: ID, amount: '5' };
  const topUp = () =>
    forwardAccountingWrite({ operator, method: 'POST', path: 'budget/top-up', body });
  let info: MockInstance<typeof console.info>;

  beforeEach(() => {
    info = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const auditLines = () => info.mock.calls.map(([line]) => JSON.parse(line));

  it('sends the validated body, logging the attempt and the outcome', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Top-up operation executed', data: null }));

    const reply = await topUp();

    expect(reply.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://cell-a/api/accounting/budget/top-up');
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
    expect(auditLines()).toEqual([
      expect.objectContaining({ phase: 'sent', operator: 'sub-1', path: 'budget/top-up', body }),
      expect.objectContaining({ phase: 'answered', status: 200 }),
    ]);
  });

  it('says the outcome is unknown when accounting does not answer a write', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    const reply = await topUp();

    expect(reply.status).toBe(502);
    expect((await reply.json()).message).toMatch(/may or may not have gone through/);
    expect(auditLines()[1]).toMatchObject({ phase: 'answered', status: 502 });
  });

  it('keeps going when the page that sent the write goes away', async () => {
    fetchMock.mockResolvedValue(json({ message: 'ok', data: null }));

    await topUp();

    const { signal } = fetchMock.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
  });

  it.each([
    [
      'a gateway timeout page',
      () => new Response('<html/>', { status: 504, headers: { 'content-type': 'text/html' } }),
    ],
    ['a JSON 502', () => json({ message: 'Bad gateway' }, 502)],
    ['a JSON 500', () => json({ message: 'Internal error' }, 500)],
  ])('says the outcome is unknown after %s on a write', async (_, upstream) => {
    fetchMock.mockResolvedValue(upstream());

    const reply = await topUp();

    expect(reply.status).toBe(502);
    expect((await reply.json()).message).toMatch(/may or may not have gone through/);
  });

  it('still says not reachable when the gateway refuses a write outright', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Forbidden' }, 403));

    const reply = await topUp();

    expect((await reply.json()).message).toBe("Accounting isn't reachable from this environment.");
  });

  it('logs what accounting says it moved', async () => {
    fetchMock.mockResolvedValue(
      json({
        message: 'Refund issued',
        data: { journal_id: 7, job_id: ID, vlab_id: ID, proj_id: ID, amount: '3.20' },
      })
    );

    await forwardAccountingWrite({
      operator,
      method: 'POST',
      path: 'admin/refund',
      body: { job_id: ID, reason: 'Failed run' },
    });

    expect(auditLines()[1].moved).toEqual({ journal_id: 7, amount: '3.20' });
  });
});
