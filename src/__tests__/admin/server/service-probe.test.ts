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
  it.each([
    'https://elsewhere',
    'entitycore',
  ])('probes only services the catalog sends to the server, not %s', async (key) => {
    await expect(probeFromServer(key)).resolves.toBeNull();
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

  it("doesn't follow a redirect", async () => {
    fetchMock.mockImplementation(async () => Response.json({ status: 'OK' }));

    await probeFromServer('accounting');
    expect(fetchMock.mock.calls.map(([, init]) => init.redirect)).toEqual(['manual', 'manual']);
  });

  it.each([
    ['a JSON 200', () => Response.json({ status: 'OK' }), 'up'],
    ['a JSON 503', () => Response.json({}, { status: 503 }), 'down'],
    ["the gateway's redirect", () => new Response(null, { status: 302 }), 'blocked'],
    [
      "the gateway's JSON 403",
      () => Response.json({ detail: 'Forbidden' }, { status: 403 }),
      'blocked',
    ],
    ["the web app's HTML 404", () => new Response('<html>', { status: 404 }), 'blocked'],
    ['an HTML 200', () => new Response('<html>', { status: 200 }), 'blocked'],
    [
      "the gateway's HTML 502 for a dead service",
      () => new Response('<html>', { status: 502 }),
      'down',
    ],
  ])('reads %s as %s', async (_name, reply, status) => {
    fetchMock.mockImplementation(async () => reply());

    await expect(probeFromServer('accounting')).resolves.toMatchObject({
      health: { status },
      version: null,
    });
  });
});
