import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server, setupMswServer } from '../tests/mocks/msw-server';

const authMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/hooks/session', () => ({ getClientSession: () => authMock() }));

const { authFetchWithoutRetry } = await import('@/auth-fetch');

setupMswServer();

describe('authFetchWithoutRetry', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it('calls fetch without Authorization when there is no session', async () => {
    authMock.mockResolvedValue(null);
    const seen: Headers[] = [];
    server.use(
      http.get('http://example.test/anon', ({ request }) => {
        seen.push(request.headers);
        return HttpResponse.json({ ok: true });
      })
    );

    const response = await authFetchWithoutRetry('http://example.test/anon');
    await response.json();

    expect(seen).toHaveLength(1);
    expect(seen[0].get('authorization')).toBeNull();
  });

  it('appends a Bearer token when a session exists', async () => {
    authMock.mockResolvedValue({ accessToken: 'tok-123' });
    const seen: string[] = [];
    server.use(
      http.get('http://example.test/me', ({ request }) => {
        seen.push(request.headers.get('authorization') ?? '');
        return HttpResponse.json({ ok: true });
      })
    );

    await authFetchWithoutRetry('http://example.test/me');

    expect(seen).toEqual(['Bearer tok-123']);
  });

  it('does not overwrite an explicit Authorization header', async () => {
    authMock.mockResolvedValue({ accessToken: 'tok-123' });
    const seen: string[] = [];
    server.use(
      http.get('http://example.test/custom', ({ request }) => {
        seen.push(request.headers.get('authorization') ?? '');
        return HttpResponse.json({ ok: true });
      })
    );

    await authFetchWithoutRetry('http://example.test/custom', {
      headers: { Authorization: 'Bearer override' },
    });

    expect(seen).toEqual(['Bearer override']);
  });

  it('preserves caller-supplied headers alongside the injected token', async () => {
    authMock.mockResolvedValue({ accessToken: 'tok-123' });
    let capturedAuth = '';
    let capturedCustom = '';
    server.use(
      http.post('http://example.test/echo', ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? '';
        capturedCustom = request.headers.get('x-extra') ?? '';
        return HttpResponse.json({ ok: true });
      })
    );

    await authFetchWithoutRetry('http://example.test/echo', {
      method: 'POST',
      headers: { 'X-Extra': 'value' },
    });

    expect(capturedAuth).toBe('Bearer tok-123');
    expect(capturedCustom).toBe('value');
  });
});
