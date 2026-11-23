import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PATCH, POST } from '@/app/api/admin/accounting/[...path]/route';

const { capabilityDenialMock } = vi.hoisted(() => ({ capabilityDenialMock: vi.fn() }));

vi.mock('@/admin/server/require-capability', () => ({ capabilityDenial: capabilityDenialMock }));
vi.mock('@/auth', () => ({ auth: async () => ({ user: { id: 'sub-1', username: 'op' } }) }));
vi.mock('@/config/server', () => ({
  serverConfig: { ACCOUNTING_URL: 'https://cell-a/accounting' },
}));

const ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const fetchMock = vi.fn();

beforeEach(() => {
  capabilityDenialMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'info').mockImplementation(() => {});
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

  it('refuses a write from outside the admin pages before checking access', async () => {
    const reply = await send('POST', 'budget/top-up', topUp, {
      'content-type': 'application/json',
      'sec-fetch-site': 'cross-site',
      'x-admin-request': '1',
    });

    expect(reply.status).toBe(403);
    expect(capabilityDenialMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks access fresh before a write', async () => {
    capabilityDenialMock.mockResolvedValue(Response.json({ message: 'no' }, { status: 503 }));

    const reply = await send('POST', 'budget/top-up', topUp);

    expect(reply.status).toBe(503);
    expect(capabilityDenialMock).toHaveBeenCalledWith('accounting.admin', { fresh: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a body the route does not take without calling accounting', async () => {
    capabilityDenialMock.mockResolvedValue(null);

    const reply = await send('POST', 'budget/top-up', { ...topUp, debited_from: ID });

    expect(reply.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a write method on a read route', async () => {
    capabilityDenialMock.mockResolvedValue(null);

    const reply = await send('POST', 'balance/system', topUp);

    expect(reply.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards a valid write with its method', async () => {
    capabilityDenialMock.mockResolvedValue(null);
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
});
