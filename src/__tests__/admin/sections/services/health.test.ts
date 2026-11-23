import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BROWSER_PROBE, probeService } from '@/admin/sections/services/health';
import { ProbedFrom } from '@/admin/sections/services/service-catalog';

import type { TServiceDescriptor } from '@/admin/sections/services/service-catalog';

const fetchMock = vi.fn();

const BASE = 'https://host/api/svc';

const SERVICE: TServiceDescriptor = {
  key: 'svc',
  label: 'Service',
  description: '',
  probedFrom: ProbedFrom.Browser,
  configKey: 'ENTITY_CORE_URL',
  healthPath: '/health',
  versionPath: '/version',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function reply(health: Response | Error, version: Response | Error = json({})) {
  fetchMock.mockImplementation(async (url: string) => {
    const answer = url.endsWith('/version') ? version : health;
    if (answer instanceof Error) throw answer;
    return answer;
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('probeService health', () => {
  it('reports a 2xx as up, and sends no token', async () => {
    reply(json('OK'));

    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      health: { status: 'up', httpStatus: 200 },
      path: '/api/svc/health',
    });
    const urls = fetchMock.mock.calls.map(([url]) => url).sort();
    expect(urls).toEqual(['https://host/api/svc/health', 'https://host/api/svc/version']);
    expect(fetchMock.mock.calls.every(([, init]) => init.headers === undefined)).toBe(true);
  });

  it('reports a non-2xx reply as down, with the status', async () => {
    reply(json({}, 503));

    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      health: { status: 'down', httpStatus: 503 },
    });
  });

  it('reports a network failure as unreachable instead of throwing', async () => {
    reply(new TypeError('Failed to fetch'));

    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      health: { status: 'unreachable' },
    });
  });
});

describe('probeService version', () => {
  it.each([
    ['app_version', { app_version: '1.2.3' }],
    ['version', { version: '1.2.3' }],
  ])('reads %s', async (_name, body) => {
    reply(json('OK'), json(body));

    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      version: '1.2.3',
    });
  });

  it('reads the version under data only when told to', async () => {
    fetchMock.mockImplementation(async () =>
      json({ version: 'v1', data: { app_version: '2.0.0' } })
    );

    await expect(
      probeService({ ...SERVICE, versionInData: true }, BASE, BROWSER_PROBE)
    ).resolves.toMatchObject({ version: '2.0.0' });
    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      version: 'v1',
    });
  });

  it('gives null when the call fails', async () => {
    reply(json('OK'), new Error('down'));

    await expect(probeService(SERVICE, BASE, BROWSER_PROBE)).resolves.toMatchObject({
      version: null,
    });
  });

  it('asks nothing when the service has no version route', async () => {
    reply(json('OK'));

    await expect(
      probeService({ ...SERVICE, versionPath: undefined }, BASE, BROWSER_PROBE)
    ).resolves.toMatchObject({ version: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
