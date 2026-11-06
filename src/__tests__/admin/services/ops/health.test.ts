import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchServiceVersion, probeServiceHealth } from '@/admin/services/ops/health';

const fetchMock = vi.fn();

const SERVICE = { baseUrl: 'https://host/api/svc', healthPath: '/health' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('probeServiceHealth', () => {
  it('reports a 2xx as operational, and sends no token', async () => {
    fetchMock.mockResolvedValueOnce(json('OK'));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({
      status: 'operational',
      httpStatus: 200,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://host/api/svc/health');
    expect(init.headers).toBeUndefined();
  });

  it('reports a non-2xx as unreachable, with the status', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({
      status: 'unreachable',
      httpStatus: 404,
    });
  });

  it('reports a network failure as unreachable instead of throwing', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(probeServiceHealth(SERVICE)).resolves.toMatchObject({ status: 'unreachable' });
  });
});

describe('fetchServiceVersion', () => {
  it.each([
    ['top-level app_version', { app_version: '1.2.3' }],
    ['top-level version', { version: '1.2.3' }],
    ['nested under data', { data: { app_version: '1.2.3' } }],
  ])('reads %s', async (_name, body) => {
    fetchMock.mockResolvedValueOnce(json(body));

    await expect(fetchServiceVersion(SERVICE.baseUrl)).resolves.toBe('1.2.3');
    expect(fetchMock.mock.calls[0][0]).toBe('https://host/api/svc/version');
  });

  it('gives null when the call fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));

    await expect(fetchServiceVersion(SERVICE.baseUrl)).resolves.toBeNull();
  });
});
