import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchServiceVersion, probeServiceHealth } from '@/features/admin/sections/services/health';

const fetchMock = vi.fn();

const BASE = 'https://host/api/svc';

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
  it('reports a 2xx as up, and sends no token', async () => {
    fetchMock.mockResolvedValueOnce(json('OK'));

    await expect(probeServiceHealth(`${BASE}/health`)).resolves.toMatchObject({
      status: 'up',
      httpStatus: 200,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://host/api/svc/health');
    expect(init.headers).toBeUndefined();
  });

  it('reports a non-2xx reply as down, with the status', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503));

    await expect(probeServiceHealth(`${BASE}/health`)).resolves.toMatchObject({
      status: 'down',
      httpStatus: 503,
    });
  });

  it('reports a network failure as unreachable instead of throwing', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(probeServiceHealth(`${BASE}/health`)).resolves.toMatchObject({
      status: 'unreachable',
    });
  });
});

describe('fetchServiceVersion', () => {
  it.each([
    ['app_version', { app_version: '1.2.3' }],
    ['version', { version: '1.2.3' }],
  ])('reads %s', async (_name, body) => {
    fetchMock.mockResolvedValueOnce(json(body));

    await expect(fetchServiceVersion(`${BASE}/version`)).resolves.toBe('1.2.3');
    expect(fetchMock.mock.calls[0][0]).toBe('https://host/api/svc/version');
  });

  it('reads the version under data only when told to', async () => {
    fetchMock.mockImplementation(async () =>
      json({ version: 'v1', data: { app_version: '2.0.0' } })
    );

    await expect(fetchServiceVersion(`${BASE}/version`, true)).resolves.toBe('2.0.0');
    await expect(fetchServiceVersion(`${BASE}/version`)).resolves.toBe('v1');
  });

  it('gives null when the call fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));

    await expect(fetchServiceVersion(`${BASE}/version`)).resolves.toBeNull();
  });
});
