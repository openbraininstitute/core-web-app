import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { probeFromServer } from '@/admin/server/service-probe';

const { serverConfig } = vi.hoisted(() => ({
  serverConfig: {
    ACCOUNTING_URL: 'https://cell-a/api/accounting' as string | undefined,
    GRADING_SERVICE_URL: undefined as string | undefined,
  },
}));

vi.mock('@/config/server', () => ({ serverConfig }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('probeFromServer', () => {
  it('probes only services from the catalog', async () => {
    await expect(probeFromServer('https://elsewhere')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says when the URL is not configured, without probing', async () => {
    await expect(probeFromServer('grading')).resolves.toEqual({
      health: { status: 'not-configured' },
      version: null,
      path: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads health and version from the configured URL', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      Response.json(url.endsWith('/version') ? { app_version: '2026.11.3' } : { status: 'OK' })
    );

    await expect(probeFromServer('accounting')).resolves.toMatchObject({
      health: { status: 'up', httpStatus: 200 },
      version: '2026.11.3',
      path: '/api/accounting/health',
    });
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      'https://cell-a/api/accounting/health',
      'https://cell-a/api/accounting/version',
    ]);
  });
});
