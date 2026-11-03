import { beforeEach, describe, expect, it, vi } from 'vitest';

import { probeServiceHealth } from './health';

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

vi.mock('@/auth-fetch', () => ({ authFetchWithoutRetry: authFetchMock }));

const SERVICE = { baseUrl: 'https://host/api/svc', healthPath: '/health', supportsVersion: true };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  authFetchMock.mockReset();
});

describe('probeServiceHealth', () => {
  it.each([
    ['top-level app_version', { app_version: '1.2.3' }],
    ['top-level version', { version: '1.2.3' }],
    ['nested under data', { data: { app_version: '1.2.3' } }],
  ])('reads the version when it is %s', async (_name, body) => {
    authFetchMock.mockResolvedValueOnce(json('OK')).mockResolvedValueOnce(json(body));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({
      status: 'operational',
      httpStatus: 200,
      version: '1.2.3',
    });
    expect(authFetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://host/api/svc/health',
      'https://host/api/svc/version',
    ]);
  });

  it('skips the version call on services without one', async () => {
    authFetchMock.mockResolvedValueOnce(json('OK'));

    const health = await probeServiceHealth({ ...SERVICE, supportsVersion: false });

    expect(health.version).toBeUndefined();
    expect(authFetchMock).toHaveBeenCalledTimes(1);
  });

  it('stays operational when the version call fails', async () => {
    authFetchMock.mockResolvedValueOnce(json('OK')).mockRejectedValueOnce(new Error('down'));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({ status: 'operational' });
  });

  it('reports a non-2xx as unreachable, with the status', async () => {
    authFetchMock.mockResolvedValueOnce(json({}, 404));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({
      status: 'unreachable',
      httpStatus: 404,
    });
  });

  it('reports a network failure as unreachable instead of throwing', async () => {
    authFetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({ status: 'unreachable' });
  });
});
