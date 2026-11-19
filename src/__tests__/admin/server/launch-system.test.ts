import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAdminJob, lookupJob } from '@/admin/server/launch-system';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/config/server', () => ({
  serverConfig: { LAUNCH_SYSTEM_URL: 'https://cell-a/api/launch-system' },
}));

const fetchMock = vi.fn();
const JOB_ID = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const BASE = 'https://cell-a/api/launch-system/';

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  authMock.mockReset();
  authMock.mockResolvedValue({ accessToken: 'tok' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAdminJob', () => {
  it("asks the admin route with the operator's token, and doesn't follow a redirect", async () => {
    const job = { id: JOB_ID, status: 'done' };
    fetchMock.mockResolvedValueOnce(Response.json(job));

    await expect(fetchAdminJob(BASE, JOB_ID, 'tok')).resolves.toEqual({ outcome: 'found', job });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://cell-a/api/launch-system/admin/job/${JOB_ID}`);
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(init.redirect).toBe('manual');
  });

  it.each([
    [
      'a JSON 404',
      Response.json({ error_code: 'NOT_FOUND' }, { status: 404 }),
      { outcome: 'not-found' },
    ],
    [
      'a JSON 403',
      Response.json({ error_code: 'NOT_AUTHORIZED' }, { status: 403 }),
      { outcome: 'denied' },
    ],
    [
      "the gateway's redirect",
      new Response(null, { status: 302 }),
      { outcome: 'not-reachable', status: 302 },
    ],
    [
      "the web app's HTML 404",
      new Response('<html>', { status: 404 }),
      { outcome: 'not-reachable', status: 404 },
    ],
    [
      'a JSON 500',
      Response.json({ message: 'Boom' }, { status: 500 }),
      { outcome: 'failed', status: 500, message: 'Boom' },
    ],
  ])('reads %s', async (_name, reply, lookup) => {
    fetchMock.mockResolvedValueOnce(reply);

    await expect(fetchAdminJob(BASE, JOB_ID, 'tok')).resolves.toEqual(lookup);
  });

  it('reads a network failure as not reachable instead of throwing', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(fetchAdminJob(BASE, JOB_ID, 'tok')).resolves.toEqual({
      outcome: 'not-reachable',
    });
  });
});

describe('lookupJob', () => {
  it('asks nothing for an id that is not a UUID', async () => {
    await expect(lookupJob('../health')).resolves.toEqual({ outcome: 'invalid-id' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the configured launch system', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: JOB_ID }));

    await lookupJob(JOB_ID);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://cell-a/api/launch-system/admin/job/${JOB_ID}`);
  });

  it('asks nothing without a session token', async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(lookupJob(JOB_ID)).resolves.toEqual({ outcome: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
