import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/admin/accounting/[...path]/route';

const { capabilityDenialMock } = vi.hoisted(() => ({ capabilityDenialMock: vi.fn() }));

vi.mock('@/admin/server/require-capability', () => ({ capabilityDenial: capabilityDenialMock }));
vi.mock('@/config/server', () => ({
  serverConfig: { ACCOUNTING_URL: 'https://cell-a/accounting' },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  capabilityDenialMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const call = (path: string, query = '') =>
  GET(new NextRequest(`http://localhost/api/admin/accounting/${path}${query}`), {
    params: Promise.resolve({ path: path.split('/') }),
  });

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

    const reply = await call('budget/top-up');

    expect(reply.status).toBe(404);
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
