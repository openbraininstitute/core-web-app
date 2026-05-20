import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server, setupMswServer } from '../../tests/mocks/msw-server';

vi.mock('@/config/server', () => ({
  serverConfig: {
    KEYCLOAK_ISSUER: 'http://kc.test/realms/x',
    KEYCLOAK_CLIENT_ID: 'cid',
    KEYCLOAK_CLIENT_SECRET: 'secret',
    AUTH_MANAGER_URL: 'http://auth-mgr.test',
    AUTH_PROXY_URL: undefined,
    DEPLOYMENT_ENV: 'preview',
  },
}));
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));

const { authOptions, refreshAccessToken } = await import('@/auth');

const KC_TOKEN_URL = 'http://kc.test/realms/x/protocol/openid-connect/token';
const AUTH_MGR_URL = 'http://auth-mgr.test/refresh-token';

const jwtCallback = authOptions.callbacks?.jwt as any;
const sessionCallback = authOptions.callbacks?.session as any;

// refreshAccessToken returns TokenSet ∪ {error}; the camelCase keys it adds
// confuse the union narrowing, so widen at the assertion site.
type RefreshResult = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
};

setupMswServer();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    server.use(http.post(AUTH_MGR_URL, () => HttpResponse.json({ ok: true })));
  });

  it('exchanges the refresh token at the Keycloak token endpoint', async () => {
    let capturedBody = '';
    let capturedContentType = '';
    server.use(
      http.post(KC_TOKEN_URL, async ({ request }) => {
        capturedContentType = request.headers.get('content-type') ?? '';
        capturedBody = await request.text();
        return HttpResponse.json({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 300,
        });
      })
    );

    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const refreshed = (await refreshAccessToken({
      accessToken: 'old',
      refreshToken: 'old-refresh',
    })) as RefreshResult;

    const params = new URLSearchParams(capturedBody);
    expect(capturedContentType).toMatch(/x-www-form-urlencoded/);
    expect(params.get('client_id')).toBe('cid');
    expect(params.get('client_secret')).toBe('secret');
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe('old-refresh');
    expect(refreshed).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      accessTokenExpires: 1_000_000 + 300 * 1000,
    });
  });

  it('falls back to the old refresh token when Keycloak omits one', async () => {
    server.use(
      http.post(KC_TOKEN_URL, () =>
        HttpResponse.json({ access_token: 'new-access', expires_in: 60 })
      )
    );

    const refreshed = (await refreshAccessToken({
      accessToken: 'old',
      refreshToken: 'kept-refresh',
    })) as RefreshResult;

    expect(refreshed.refreshToken).toBe('kept-refresh');
    expect(refreshed.accessToken).toBe('new-access');
  });

  it('returns RefreshAccessTokenError on a non-2xx response', async () => {
    server.use(
      http.post(KC_TOKEN_URL, () => HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }))
    );

    const refreshed = (await refreshAccessToken({
      accessToken: 'old',
      refreshToken: 'old-refresh',
    })) as RefreshResult;

    expect(refreshed).toMatchObject({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      error: 'RefreshAccessTokenError',
    });
  });

  it('returns RefreshAccessTokenError when the network throws', async () => {
    server.use(http.post(KC_TOKEN_URL, () => HttpResponse.error()));

    const refreshed = (await refreshAccessToken({
      accessToken: 'old',
      refreshToken: 'old-refresh',
    })) as RefreshResult;

    expect(refreshed.error).toBe('RefreshAccessTokenError');
  });

  it('syncs the refreshed token to the auth manager with a Bearer header', async () => {
    server.use(
      http.post(KC_TOKEN_URL, () =>
        HttpResponse.json({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 60,
        })
      )
    );

    let capturedAuth = '';
    let capturedBody: unknown = null;
    server.use(
      http.post(AUTH_MGR_URL, async ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? '';
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    await refreshAccessToken({
      accessToken: 'old',
      refreshToken: 'old-refresh',
    });

    expect(capturedAuth).toBe('Bearer new-access');
    expect(capturedBody).toEqual({ refresh_token: 'new-refresh' });
  });
});

describe('authOptions.callbacks.jwt', () => {
  beforeEach(() => {
    server.use(http.post(AUTH_MGR_URL, () => HttpResponse.json({ ok: true })));
  });

  it('enriches the token from account + user on initial sign-in', async () => {
    const result = await jwtCallback({
      token: {},
      account: {
        provider: 'keycloak',
        providerAccountId: 'kc-id',
        type: 'oauth',
        access_token: 'a-token',
        refresh_token: 'r-token',
        id_token: 'id-token',
        expires_at: 2_000_000,
      },
      user: { id: 'u1', name: 'Alice', email: 'alice@test' },
      profile: { sub: 'kc-subject', identity_provider: 'idp' },
      trigger: 'signIn',
      isNewUser: false,
    });

    expect(result).toMatchObject({
      accessToken: 'a-token',
      refreshToken: 'r-token',
      idToken: 'id-token',
      accessTokenExpires: 2_000_000 * 1000,
      user: {
        id: 'kc-subject',
        name: 'Alice',
        identityProvider: 'idp',
      },
    });
  });

  it('returns the existing token unchanged when it is still fresh', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    const token = {
      accessToken: 'live',
      refreshToken: 'r',
      accessTokenExpires: 30 * 60 * 1000,
    };

    const result = await jwtCallback({ token });

    expect(result).toBe(token);
  });

  it('refreshes via Keycloak when the token is past the renewal threshold', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
    server.use(
      http.post(KC_TOKEN_URL, () =>
        HttpResponse.json({
          access_token: 'renewed',
          refresh_token: 'renewed-r',
          expires_in: 60,
        })
      )
    );

    const result = await jwtCallback({
      token: {
        accessToken: 'old',
        refreshToken: 'old-r',
        accessTokenExpires: 1_000_000_000,
      },
    });

    expect(result).toMatchObject({
      accessToken: 'renewed',
      refreshToken: 'renewed-r',
    });
  });
});

describe('authOptions.callbacks.session', () => {
  it('projects token claims onto the session', async () => {
    const result = await sessionCallback({
      session: { user: { name: 'session-name' }, expires: '' },
      token: {
        accessToken: 'a-tok',
        idToken: 'id-tok',
        accessTokenExpires: Date.UTC(2026, 0, 1),
        user: { id: 'u1', email: 'u@x' },
      },
    });

    expect(result).toMatchObject({
      accessToken: 'a-tok',
      idToken: 'id-tok',
      expires: new Date(Date.UTC(2026, 0, 1)).toISOString(),
      user: { id: 'u1', email: 'u@x', name: 'session-name' },
    });
  });

  it('passes through the error flag onto the session', async () => {
    const result = await sessionCallback({
      session: { user: {}, expires: '' },
      token: {
        accessToken: 'a',
        idToken: 'i',
        accessTokenExpires: 0,
        error: 'RefreshAccessTokenError',
      },
    });

    expect(result.error).toBe('RefreshAccessTokenError');
  });
});
