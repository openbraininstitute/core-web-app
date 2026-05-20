import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server, setupMswServer } from '../../tests/mocks/msw-server';

const authMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/hooks/session', () => ({ getClientSession: () => authMock() }));
vi.mock('@/utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logTrace: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { default: authApiClient } = await import('@/api/api-client');
const { default: ApiError } = await import('@/api/error');

const BASE = 'http://api.test';

setupMswServer();

beforeEach(() => {
  authMock.mockReset();
  authMock.mockResolvedValue(null);
});

describe('authApiClient — request shape', () => {
  it('sends a GET and parses a JSON response', async () => {
    server.use(http.get(`${BASE}/items`, () => HttpResponse.json({ items: [1, 2, 3] })));

    const client = await authApiClient(BASE);
    const data = await client.get<{ items: number[] }>('/items');

    expect(data).toEqual({ items: [1, 2, 3] });
  });

  it('injects a Bearer token from the session', async () => {
    authMock.mockResolvedValue({ accessToken: 'abc' });
    let seen = '';
    server.use(
      http.get(`${BASE}/me`, ({ request }) => {
        seen = request.headers.get('authorization') ?? '';
        return HttpResponse.json({});
      })
    );

    const client = await authApiClient(BASE);
    await client.get('/me');

    expect(seen).toBe('Bearer abc');
  });

  it('omits Authorization when there is no session', async () => {
    let seen: string | null = '';
    server.use(
      http.get(`${BASE}/anon`, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({});
      })
    );

    const client = await authApiClient(BASE);
    await client.get('/anon');

    expect(seen).toBeNull();
  });

  it('appends query params, expanding arrays and omitting nil values', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${BASE}/search`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({});
      })
    );

    const client = await authApiClient(BASE);
    await client.get('/search', {
      queryParams: {
        q: 'cells',
        ids: ['a', 'b'],
        flag: true,
        skip: null,
        missing: undefined,
      },
    });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get('q')).toBe('cells');
    expect(url.searchParams.getAll('ids')).toEqual(['a', 'b']);
    expect(url.searchParams.get('flag')).toBe('true');
    expect(url.searchParams.has('skip')).toBe(false);
    expect(url.searchParams.has('missing')).toBe(false);
  });

  it('stringifies JSON bodies on POST', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${BASE}/create`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 1 });
      })
    );

    const client = await authApiClient(BASE);
    await client.post('/create', { body: { name: 'Foo' } });

    expect(body).toEqual({ name: 'Foo' });
  });

  it('passes FormData bodies through without JSON-encoding', async () => {
    let contentType = '';
    let raw = '';
    server.use(
      http.post(`${BASE}/upload`, async ({ request }) => {
        contentType = request.headers.get('content-type') ?? '';
        raw = await request.text();
        return HttpResponse.json({ ok: true });
      })
    );

    const fd = new FormData();
    fd.append('file', new Blob(['hello'], { type: 'text/plain' }), 'a.txt');

    const client = await authApiClient(BASE);
    await client.post('/upload', { body: fd });

    expect(contentType).toMatch(/^multipart\/form-data;/);
    expect(raw).toContain('hello');
  });
});

describe('authApiClient — response decoding', () => {
  it('returns text when Content-Type is text/*', async () => {
    server.use(http.get(`${BASE}/text`, () => HttpResponse.text('plain string')));

    const client = await authApiClient(BASE);
    const data = await client.get<string>('/text');

    expect(data).toBe('plain string');
  });

  it('returns a Blob for application/octet-stream', async () => {
    server.use(
      http.get(`${BASE}/binary`, () =>
        HttpResponse.arrayBuffer(new Uint8Array([1, 2, 3]).buffer, {
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      )
    );

    const client = await authApiClient(BASE);
    const data = await client.get<Blob>('/binary');

    expect(data).toBeInstanceOf(Blob);
    expect(data.size).toBe(3);
  });

  it('returns the raw Response when asRawResponse is set', async () => {
    server.use(http.get(`${BASE}/raw`, () => HttpResponse.json({ ok: true }, { status: 201 })));

    const client = await authApiClient(BASE);
    const data = await client.get<Response>('/raw', undefined, { asRawResponse: true });

    expect(data).toBeInstanceOf(Response);
    expect(data.status).toBe(201);
  });
});

describe('authApiClient — errors and retries', () => {
  it('throws ApiError carrying the status on a non-ok response', async () => {
    server.use(
      http.get(`${BASE}/missing`, () =>
        HttpResponse.json({ message: 'Not here', code: 'not_found' }, { status: 404 })
      )
    );

    const client = await authApiClient(BASE);
    const err = await client.get('/missing').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.cause).toMatchObject({ status: 404, code: 'not_found', message: 'Not here' });
  });

  it('retries failed responses up to `attempts` when retryOnError is set', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/flaky`, () => {
        calls += 1;
        if (calls < 3) return HttpResponse.json({ message: 'down' }, { status: 503 });
        return HttpResponse.json({ ok: true });
      })
    );

    const client = await authApiClient(BASE);
    const data = await client.get('/flaky', undefined, {
      attempts: 3,
      retryOnError: true,
      backoff: { type: 'exponential', delay: 0 },
    });

    expect(calls).toBe(3);
    expect(data).toEqual({ ok: true });
  });
});
