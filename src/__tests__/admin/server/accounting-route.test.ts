import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH, POST } from '@/app/api/admin/accounting/[...path]/route';

import type { MockInstance } from 'vitest';

const { capabilityDenialMock, writeAccessMock } = vi.hoisted(() => ({
  capabilityDenialMock: vi.fn(),
  writeAccessMock: vi.fn(),
}));

vi.mock('@/admin/server/require-capability', () => ({
  capabilityDenial: capabilityDenialMock,
  writeAccess: writeAccessMock,
}));
vi.mock('@/config/server', () => ({
  serverConfig: { ACCOUNTING_URL: 'https://cell-a/accounting' },
}));

const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const fetchMock = vi.fn();
let info: MockInstance<typeof console.info>;

beforeEach(() => {
  capabilityDenialMock.mockReset();
  writeAccessMock.mockReset();
  writeAccessMock.mockResolvedValue({ operator: { id: 'sub-1', username: 'op' } });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });

const call = (path: string, query = '') =>
  GET(new NextRequest(`http://localhost/api/admin/accounting/${path}${query}`), context(path));

const ADMIN_HEADERS = {
  'sec-fetch-site': 'same-origin',
  'x-admin-request': '1',
  'content-type': 'application/json',
};

const send = (
  method: 'POST' | 'PATCH',
  path: string,
  body: unknown,
  headers: Record<string, string> = ADMIN_HEADERS
) =>
  (method === 'POST' ? POST : PATCH)(
    new NextRequest(`http://localhost/api/admin/accounting/${path}`, {
      method,
      headers,
      body: JSON.stringify(body),
    }),
    context(path)
  );

describe('accounting proxy route', () => {
  it.each([
    ['a signed-out caller', 401],
    ['an operator without the accounting group', 403],
  ])('turns away %s before reading the path or calling accounting', async (_, status) => {
    capabilityDenialMock.mockResolvedValue(Response.json({ message: 'no' }, { status }));

    const reply = await call('budget/top-up');

    expect(reply.status).toBe(status);
    expect(capabilityDenialMock).toHaveBeenCalledWith('accounting.admin');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a route outside the allowlist without calling accounting', async () => {
    capabilityDenialMock.mockResolvedValue(null);

    const reply = await call('usage/oneshot');

    expect(reply.status).toBe(404);
    expect(reply.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards an allowed read', async () => {
    capabilityDenialMock.mockResolvedValue(null);
    fetchMock.mockResolvedValue(
      Response.json({ message: 'ok', data: { balance: '1.00' } }, { status: 200 })
    );

    const reply = await call('balance/system');

    expect(fetchMock.mock.calls[0][0]).toBe('https://cell-a/accounting/balance/system');
    await expect(reply.json()).resolves.toEqual({ message: 'ok', data: { balance: '1.00' } });
  });
});

describe('accounting proxy writes', () => {
  const topUp = { vlab_id: ID, amount: '10' };
  const denial = (status: number) => ({
    denial: Response.json({ message: 'no' }, { status }),
  });

  it('refuses a write from outside the admin pages before checking access', async () => {
    const reply = await send('POST', 'budget/top-up', topUp, {
      'content-type': 'application/json',
      'sec-fetch-site': 'cross-site',
      'x-admin-request': '1',
    });

    expect(reply.status).toBe(400);
    expect(writeAccessMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    401, 403, 503,
  ])('passes on a %i from the access check, with no audit line', async (status) => {
    writeAccessMock.mockResolvedValue(denial(status));

    const reply = await send('POST', 'budget/top-up', topUp);

    expect(reply.status).toBe(status);
    expect(writeAccessMock).toHaveBeenCalledWith('accounting.write');
    expect(info).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a body the route does not take without calling accounting', async () => {
    const reply = await send('POST', 'budget/top-up', { ...topUp, debited_from: ID });

    expect(reply.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a write method on a read route', async () => {
    const reply = await send('POST', 'balance/system', topUp);

    expect(reply.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs a refused write', async () => {
    await send('POST', 'budget/top-up', { ...topUp, amount: 10 });

    const lines = info.mock.calls.map(([line]) => JSON.parse(line));
    expect(lines).toEqual([
      expect.objectContaining({
        phase: 'refused',
        operator: 'sub-1',
        path: 'budget/top-up',
        status: 400,
      }),
    ]);
  });

  it('keeps a write going when the page that sent it goes away', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'ok', data: null }));

    await POST(
      new NextRequest('http://localhost/api/admin/accounting/budget/top-up', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(topUp),
        signal: AbortSignal.abort(),
      }),
      context('budget/top-up')
    );

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
  });

  it('forwards a valid write with its method', async () => {
    const status = { accounts: [], open_job_ids: [] };
    fetchMock.mockResolvedValue(Response.json({ message: 'Account disabled', data: status }));

    const reply = await send('PATCH', `admin/account/${ID}`, { enabled: false });

    expect(reply.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://cell-a/accounting/admin/account/${ID}`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      body: '{"enabled":false}',
    });
  });

  it('forwards a discount delete without a body', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'Discount deleted', data: null }));

    const reply = await DELETE(
      new NextRequest('http://localhost/api/admin/accounting/admin/discount/7', {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
        body: '{}',
      }),
      context('admin/discount/7')
    );

    expect(reply.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://cell-a/accounting/admin/discount/7');
    expect(init).toMatchObject({ method: 'DELETE', body: undefined });
  });
});
