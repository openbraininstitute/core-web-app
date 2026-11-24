// @vitest-environment node
import { createSign, generateKeyPairSync } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionError } from '@/features/auth/types';

const ISSUER = 'https://keycloak.test/realms/obi';
const APP = 'https://app.test';
const AUTH_MANAGER = 'https://auth-manager.test';
const SECRET = 'test-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
const MINUTE = 60 * 1000;

const serverConfig = vi.hoisted(
  () =>
    ({
      KEYCLOAK_ISSUER: 'https://keycloak.test/realms/obi',
      KEYCLOAK_CLIENT_ID: 'core-web-app',
      KEYCLOAK_CLIENT_SECRET: 'client-secret',
      BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
      BETTER_AUTH_URL: 'https://app.test',
      AUTH_MANAGER_URL: 'https://auth-manager.test',
      DEPLOYMENT_ENV: 'production',
    }) as Record<string, string | undefined>
);
vi.mock('@/config/server', () => ({ serverConfig }));
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

const USERS: Record<string, { name: string; email: string }> = {
  '1': { name: 'Ada Lovelace', email: 'ada@example.org' },
  bob: { name: 'Bob', email: 'bob@example.org' },
  twin: { name: 'Ada Again', email: 'ada@example.org' },
};
/** The default user keeps bare token names; the others carry their name. */
const tokenPrefix = (user: string) => (user === '1' ? '' : `${user}:`);
const userOfToken = (token: string) => (token.includes(':') ? token.split(':')[0] : '1');

function signIdToken(nonce: string | null, user = '1', audience = serverConfig.KEYCLOAK_CLIENT_ID) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${base64url({ alg: 'RS256', kid: 'key-1' })}.${base64url({
    iss: ISSUER,
    aud: audience,
    sub: `keycloak-subject-${user}`,
    iat: now,
    exp: now + 300,
    nonce,
    name: USERS[user].name,
    email: USERS[user].email,
    email_verified: true,
    preferred_username: user === '1' ? 'ada' : user,
    identity_provider: 'github',
  })}`;
  return `${body}.${createSign('RSA-SHA256').update(body).sign(privateKey, 'base64url')}`;
}

type TKeycloak = {
  nonces: Map<string, string | null>;
  refreshesByUser: Map<string, number>;
  accessTokenLifetimeS: number;
  refreshes: number;
  refreshFails: boolean;
  usedRefreshTokens: string[];
  authManagerCalls: { authorization: string | null; refreshToken: string }[];
};

let keycloak: TKeycloak;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = request.url;

  if (url === `${ISSUER}/.well-known/openid-configuration`) {
    return json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/protocol/openid-connect/auth`,
      token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
      userinfo_endpoint: `${ISSUER}/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
      jwks_uri: `${ISSUER}/protocol/openid-connect/certs`,
      id_token_signing_alg_values_supported: ['RS256'],
    });
  }
  if (url === `${ISSUER}/protocol/openid-connect/certs`) {
    return json({
      keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'key-1', alg: 'RS256', use: 'sig' }],
    });
  }
  if (url === `${ISSUER}/protocol/openid-connect/token`) {
    const form = new URLSearchParams(await request.text());
    if (form.get('grant_type') === 'authorization_code') {
      const code = form.get('code') ?? '';
      const user = code.split('-')[1];
      return json({
        access_token: `${tokenPrefix(user)}access-1`,
        refresh_token: `${tokenPrefix(user)}refresh-1`,
        id_token: signIdToken(keycloak.nonces.get(code) ?? null, user),
        token_type: 'Bearer',
        expires_in: keycloak.accessTokenLifetimeS,
      });
    }
    const used = form.get('refresh_token') ?? '';
    const user = userOfToken(used);
    const count = (keycloak.refreshesByUser.get(user) ?? 0) + 1;
    keycloak.refreshesByUser.set(user, count);
    keycloak.refreshes += 1;
    keycloak.usedRefreshTokens.push(used);
    if (keycloak.refreshFails) return json({ error: 'invalid_grant' }, 400);
    await new Promise((resolve) => setImmediate(resolve));
    return json({
      access_token: `${tokenPrefix(user)}access-${count + 1}`,
      refresh_token: `${tokenPrefix(user)}refresh-${count + 1}`,
      token_type: 'Bearer',
      expires_in: keycloak.accessTokenLifetimeS,
    });
  }
  if (url === `${AUTH_MANAGER}/refresh-token`) {
    keycloak.authManagerCalls.push({
      authorization: request.headers.get('authorization'),
      refreshToken: (await request.json()).refresh_token,
    });
    return json({});
  }
  throw new Error(`unexpected request to ${url}`);
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  attributes = new Map<string, string>();

  store(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split('; ');
      const name = pair.slice(0, pair.indexOf('='));
      const value = pair.slice(pair.indexOf('=') + 1);
      this.attributes.set(name, attributes.join('; '));
      if (value === '' || attributes.includes('Max-Age=0')) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  get names() {
    return [...this.cookies.keys()];
  }

  get header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }
}

async function loadAuth() {
  vi.resetModules();
  const { getAuth } = await import('@/features/auth/auth');
  return getAuth();
}

type TAuth = Awaited<ReturnType<typeof loadAuth>>;

async function call(auth: TAuth, jar: CookieJar, path: string, init: RequestInit = {}) {
  const response = await auth.handler(
    new Request(`${APP}/api/auth${path}`, {
      ...init,
      headers: { origin: APP, cookie: jar.header, ...init.headers },
    })
  );
  jar.store(response);
  return response;
}

let signIns = 0;

async function signIn(
  auth: TAuth,
  jar: CookieJar,
  callbackURL = '/app/virtual-lab/sync',
  user = '1'
) {
  const started = await call(auth, jar, '/sign-in/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'keycloak', callbackURL }),
  });
  const authorization = new URL((await started.json()).url);
  signIns += 1;
  const code = `code-${user}-${signIns}`;
  keycloak.nonces.set(code, authorization.searchParams.get('nonce'));

  const state = authorization.searchParams.get('state');
  const returned = await call(auth, jar, `/callback/keycloak?code=${code}&state=${state}`);
  return { authorization, returned };
}

const getSession = async (auth: TAuth, jar: CookieJar) =>
  (await call(auth, jar, '/get-session')).json();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  serverConfig.AUTH_PROXY_URL = undefined;
  serverConfig.DEPLOYMENT_ENV = 'production';
  keycloak = {
    nonces: new Map(),
    refreshesByUser: new Map(),
    accessTokenLifetimeS: 60 * 60,
    refreshes: 0,
    refreshFails: false,
    usedRefreshTokens: [],
    authManagerCalls: [],
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('signing in with Keycloak', () => {
  it('asks Keycloak for the same scopes and callback as before, with PKCE', async () => {
    const { authorization } = await signIn(await loadAuth(), new CookieJar());

    expect(authorization.origin + authorization.pathname).toBe(
      `${ISSUER}/protocol/openid-connect/auth`
    );
    expect(authorization.searchParams.get('scope')).toBe('openid profile groups');
    expect(authorization.searchParams.get('redirect_uri')).toBe(
      `${APP}/api/auth/callback/keycloak`
    );
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('returns to the requested page with the session kept in cookies only', async () => {
    const jar = new CookieJar();
    const { returned } = await signIn(await loadAuth(), jar);

    expect(returned.status).toBe(302);
    expect(returned.headers.get('location')).toBe('/app/virtual-lab/sync');
    expect(jar.names.some((name) => name.startsWith('__Secure-core-web-app.session_token'))).toBe(
      true
    );
    expect(jar.names.some((name) => name.startsWith('__Secure-core-web-app.session_data'))).toBe(
      true
    );
    expect(jar.names.some((name) => name.startsWith('__Secure-core-web-app.account_data'))).toBe(
      true
    );
  });

  it('hands the refresh token to auth-manager', async () => {
    await signIn(await loadAuth(), new CookieJar());
    await vi.waitFor(() =>
      expect(keycloak.authManagerCalls).toEqual([
        { authorization: 'Bearer access-1', refreshToken: 'refresh-1' },
      ])
    );
  });

  it('serves the session on any server instance, since nothing is kept in memory', async () => {
    const jar = new CookieJar();
    await signIn(await loadAuth(), jar);

    const otherInstance = await loadAuth();

    expect((await getSession(otherInstance, jar)).user.id).toBe('keycloak-subject-1');
  });
});

describe('the session the app reads', () => {
  it('holds the Keycloak user and tokens, and nothing of Better Auth itself', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    expect(await getSession(auth, jar)).toEqual({
      user: {
        id: 'keycloak-subject-1',
        name: 'Ada Lovelace',
        email: 'ada@example.org',
        username: 'ada',
        identityProvider: 'github',
      },
      accessToken: 'access-1',
      idToken: expect.stringMatching(/^ey/),
      expires: '2026-11-23T11:00:00.000Z',
    });
    expect(keycloak.refreshes).toBe(0);
  });

  it('is null without a session cookie', async () => {
    expect(await getSession(await loadAuth(), new CookieJar())).toBeNull();
  });

  it('renews the access token twenty minutes before it expires, and tells auth-manager', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    vi.setSystemTime(Date.now() + 39 * MINUTE);
    expect((await getSession(auth, jar)).accessToken).toBe('access-1');

    vi.setSystemTime(Date.now() + 2 * MINUTE);
    const renewed = await getSession(auth, jar);

    expect(renewed.accessToken).toBe('access-2');
    expect(renewed.error).toBeUndefined();
    expect(renewed.idToken).toMatch(/^ey/);
    await vi.waitFor(() =>
      expect(keycloak.authManagerCalls.at(-1)).toEqual({
        authorization: 'Bearer access-2',
        refreshToken: 'refresh-2',
      })
    );

    expect((await getSession(auth, jar)).accessToken).toBe('access-2');
    expect(keycloak.refreshes).toBe(1);
  });

  it('asks Keycloak once when several requests find the token due at the same time', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    vi.setSystemTime(Date.now() + 45 * MINUTE);

    const sessions = await Promise.all([
      getSession(auth, new CookieJarCopy(jar)),
      getSession(auth, new CookieJarCopy(jar)),
      getSession(auth, new CookieJarCopy(jar)),
    ]);

    expect(sessions.map((session) => session.accessToken)).toEqual([
      'access-2',
      'access-2',
      'access-2',
    ]);
    expect(keycloak.refreshes).toBe(1);
  });

  it('does not use a refresh token twice for a request that left before the renewed cookie arrived', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    vi.setSystemTime(Date.now() + 45 * MINUTE);
    const beforeRenewal = new CookieJarCopy(jar);

    await getSession(auth, jar);
    const late = await getSession(auth, beforeRenewal);

    expect(late.accessToken).toBe('access-2');
    expect(late.error).toBeUndefined();
    expect(keycloak.refreshes).toBe(1);
  });

  it('keeps the renewed tokens when the session cookie is re-issued by the same request', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    vi.setSystemTime(Date.now() + 90 * MINUTE);
    expect((await getSession(auth, jar)).accessToken).toBe('access-2');
    vi.setSystemTime(Date.now() + 90 * MINUTE);
    await getSession(await loadAuth(), jar);

    expect(keycloak.usedRefreshTokens).toEqual(['refresh-1', 'refresh-2']);
  });

  it('asks Keycloak again after a failed renewal', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    vi.setSystemTime(Date.now() + 45 * MINUTE);
    keycloak.refreshFails = true;
    await getSession(auth, new CookieJarCopy(jar));
    keycloak.refreshFails = false;

    expect((await getSession(auth, jar)).error).toBeUndefined();
    expect(keycloak.refreshes).toBe(2);
  });

  it('marks the session when Keycloak refuses to renew, and keeps the user', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    vi.setSystemTime(Date.now() + 45 * MINUTE);
    keycloak.refreshFails = true;

    const session = await getSession(auth, jar);

    expect(session.error).toBe(AuthSessionError.RefreshAccessToken);
    expect(session.user.id).toBe('keycloak-subject-1');
    expect(session.accessToken).toBe('access-1');
  });

  it('marks the session when the cookie that holds the tokens is gone', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    const withoutTokens = new CookieJarCopy(jar, (name) => !name.includes('account_data'));
    const session = await getSession(auth, withoutTokens);

    expect(session.error).toBe(AuthSessionError.RefreshAccessToken);
    expect(session.accessToken).toBe('');
    expect(session.user.id).toBe('keycloak-subject-1');
  });

  it('ends after ten hours without use', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    vi.setSystemTime(Date.now() + 10 * 60 * MINUTE + MINUTE);

    expect(await getSession(await loadAuth(), jar)).toBeNull();
  });

  it('lasts as long as it is used', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    for (let hour = 0; hour < 30; hour += 1) {
      vi.setSystemTime(Date.now() + 60 * MINUTE);
      expect((await getSession(auth, jar))?.user.id).toBe('keycloak-subject-1');
    }
  });
});

describe('two users on the same server', () => {
  it('each read their own session and tokens, also when both renew at the same moment', async () => {
    const auth = await loadAuth();
    const ada = new CookieJar();
    const bob = new CookieJar();
    await Promise.all([signIn(auth, ada), signIn(auth, bob, undefined, 'bob')]);

    const before = await Promise.all([getSession(auth, ada), getSession(auth, bob)]);
    expect(before.map((s) => [s.user.id, s.user.email, s.accessToken])).toEqual([
      ['keycloak-subject-1', 'ada@example.org', 'access-1'],
      ['keycloak-subject-bob', 'bob@example.org', 'bob:access-1'],
    ]);

    vi.setSystemTime(Date.now() + 45 * MINUTE);
    const renewed = await Promise.all([
      getSession(auth, new CookieJarCopy(ada)),
      getSession(auth, new CookieJarCopy(bob)),
      getSession(auth, new CookieJarCopy(ada)),
      getSession(auth, new CookieJarCopy(bob)),
    ]);

    expect(renewed.map((s) => [s.user.id, s.accessToken])).toEqual([
      ['keycloak-subject-1', 'access-2'],
      ['keycloak-subject-bob', 'bob:access-2'],
      ['keycloak-subject-1', 'access-2'],
      ['keycloak-subject-bob', 'bob:access-2'],
    ]);
    expect(keycloak.usedRefreshTokens.sort()).toEqual(['bob:refresh-1', 'refresh-1']);
  });

  it('send each refresh token to auth-manager with the access token of the same user', async () => {
    const auth = await loadAuth();
    await Promise.all([
      signIn(auth, new CookieJar()),
      signIn(auth, new CookieJar(), undefined, 'bob'),
    ]);

    await vi.waitFor(() => expect(keycloak.authManagerCalls).toHaveLength(2));
    expect(
      keycloak.authManagerCalls.map((c) => `${c.authorization} ${c.refreshToken}`).sort()
    ).toEqual(['Bearer access-1 refresh-1', 'Bearer bob:access-1 bob:refresh-1']);
  });

  it('stay two users when their Keycloak accounts share an e-mail address', async () => {
    const auth = await loadAuth();
    const ada = new CookieJar();
    const twin = new CookieJar();
    await signIn(auth, ada);
    await signIn(auth, twin, undefined, 'twin');

    expect((await getSession(auth, twin)).user.id).toBe('keycloak-subject-twin');
    expect((await getSession(auth, twin)).accessToken).toBe('twin:access-1');
    expect((await getSession(auth, ada)).user.id).toBe('keycloak-subject-1');
    expect((await getSession(auth, ada)).accessToken).toBe('access-1');
  });

  it('cannot use a session cookie that was altered', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    const altered = jar.header.replace(/(session_data=[^;]{40})./, '$1x');

    const response = await auth.handler(
      new Request(`${APP}/api/auth/get-session`, { headers: { cookie: altered } })
    );

    expect(altered).not.toBe(jar.header);
    expect(await response.json()).toBeNull();
  });
});

describe('what leaves the server', () => {
  it('marks the session answer as not cacheable, so no proxy can serve it to someone else', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    const response = await call(auth, jar, '/get-session');

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('keeps every session cookie out of reach of scripts and of other sites', async () => {
    const jar = new CookieJar();
    await signIn(await loadAuth(), jar);

    const session = jar.names.filter((name) =>
      /session_token|session_data|account_data/.test(name)
    );
    for (const name of session) {
      expect(jar.attributes.get(name)).toMatch(/HttpOnly/);
      expect(jar.attributes.get(name)).toMatch(/Secure/);
      expect(jar.attributes.get(name)).toMatch(/SameSite=Lax/);
      expect(jar.attributes.get(name)).not.toMatch(/Domain=/);
    }
  });

  it('refuses to return to another site after sign-in', async () => {
    const jar = new CookieJar();
    const response = await call(await loadAuth(), jar, '/sign-in/social', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'keycloak',
        callbackURL: 'https://evil.test/app/virtual-lab/sync',
      }),
    });

    expect(response.status).toBe(403);
    expect(jar.names).toEqual([]);
  });

  it('refuses a sign-in started from another site', async () => {
    const response = await (await loadAuth()).handler(
      new Request(`${APP}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.test', cookie: 'a=b' },
        body: JSON.stringify({ provider: 'keycloak', callbackURL: '/app' }),
      })
    );

    expect(response.status).toBe(403);
  });
});

describe('the memory of the server', () => {
  const rows = async (auth: TAuth) => {
    const { adapter } = await auth.$context;
    const [users, accounts, sessions] = await Promise.all(
      ['user', 'account', 'session'].map((model) => adapter.count({ model }))
    );
    return { users, accounts, sessions };
  };

  it('keeps nothing of a sign-in, so it does not grow with the number of users', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();

    await signIn(auth, jar);
    await signIn(auth, new CookieJar());

    expect(await rows(auth)).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect((await getSession(auth, jar)).accessToken).toBe('access-1');
  });
});

describe('another Better Auth app on the same host', () => {
  it('cannot shadow the session with its own cookies of the same kind', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);
    const foreign = [
      '__Secure-better-auth.session_token=someone-else.signature',
      '__Secure-better-auth.session_data=not-ours',
      '__Secure-better-auth.account_data.0=not-ours',
      'better-auth.session_token=someone-else.signature',
    ].join('; ');

    const response = await auth.handler(
      new Request(`${APP}/api/auth/get-session`, {
        headers: { cookie: `${foreign}; ${jar.header}` },
      })
    );

    expect((await response.json()).user.id).toBe('keycloak-subject-1');
  });
});

describe('what a user cannot do', () => {
  const post = (auth: TAuth, jar: CookieJar, path: string, body: unknown) =>
    call(auth, jar, path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('turn an ID token into a session, as that would make a leaked ID token a way in', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();

    const response = await post(auth, jar, '/sign-in/social', {
      provider: 'keycloak',
      idToken: { token: signIdToken(null, 'bob'), accessToken: 'access-of-someone-else' },
    });

    expect(response.status).toBe(400);
    expect(jar.names).toEqual([]);
    expect(await getSession(auth, jar)).toBeNull();
  });

  it('read their refresh token from a script: it never leaves the encrypted cookie', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    for (const path of ['/refresh-token', '/get-access-token']) {
      const response = await post(auth, jar, path, { useAccountCookie: true });

      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('refresh-1');
    }
    const accountInfo = await call(auth, jar, '/account-info?useAccountCookie=true');
    expect(accountInfo.status).toBe(404);
    expect(keycloak.refreshes).toBe(0);
  });

  it('pair their session with the tokens of another account', async () => {
    const auth = await loadAuth();
    const ada = new CookieJar();
    const bob = new CookieJar();
    await signIn(auth, ada);
    await signIn(auth, bob, undefined, 'bob');
    const mixed = new CookieJar();
    const response = new Response(null);
    for (const pair of ada.header.split('; ').filter((c) => !c.includes('account_data'))) {
      response.headers.append('set-cookie', pair);
    }
    for (const pair of bob.header.split('; ').filter((c) => c.includes('account_data'))) {
      response.headers.append('set-cookie', pair);
    }
    mixed.store(response);

    const session = await getSession(auth, mixed);

    expect(session.user.id).toBe('keycloak-subject-1');
    expect(session.accessToken).toBe('');
    expect(session.error).toBe(AuthSessionError.RefreshAccessToken);
    expect(JSON.stringify(session)).not.toContain('bob');
  });

  it('create an account with a password and a subject of their choice', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();

    const response = await post(auth, jar, '/sign-up/email', {
      email: 'mallory@example.org',
      password: 'a-long-password-1234',
      name: 'Mallory',
      subject: 'keycloak-subject-1',
      username: 'ada',
    });

    expect(response.ok).toBe(false);
    expect(await getSession(auth, jar)).toBeNull();
  });

  it('rewrite the subject of their own session', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar, undefined, 'bob');

    const response = await post(auth, jar, '/update-session', { subject: 'keycloak-subject-1' });

    expect(response.ok).toBe(false);
    expect((await getSession(auth, jar)).user.id).toBe('keycloak-subject-bob');
  });

  it('edit the profile Keycloak owns', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    const response = await call(auth, jar, '/update-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Mallory', subject: 'someone-else' }),
    });

    expect(response.status).toBe(404);
    expect((await getSession(auth, jar)).user).toMatchObject({
      id: 'keycloak-subject-1',
      name: 'Ada Lovelace',
    });
  });
});

describe('signing out', () => {
  it('removes every cookie and leaves the Keycloak logout to the log-out page', async () => {
    const auth = await loadAuth();
    const jar = new CookieJar();
    await signIn(auth, jar);

    const response = await call(auth, jar, '/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    expect(await response.json()).toEqual({ success: true });
    expect(jar.names.filter((name) => /session|account/.test(name))).toEqual([]);
    expect(await getSession(auth, jar)).toBeNull();
  });
});

describe('preview deployments', () => {
  it('share the session cookies with the auth proxy through the parent domain', async () => {
    serverConfig.AUTH_PROXY_URL = 'https://auth.preview.openbraininstitute.org';
    serverConfig.DEPLOYMENT_ENV = 'preview';
    const jar = new CookieJar();

    const { returned } = await signIn(await loadAuth(), jar, '/api/auth/redirect-after-signin');

    expect(returned.headers.get('location')).toBe('/api/auth/redirect-after-signin');
    const session = jar.names.filter((name) =>
      /session_token|session_data|account_data/.test(name)
    );
    expect(session.length).toBeGreaterThanOrEqual(3);
    for (const name of session) {
      expect(jar.attributes.get(name)).toContain('Domain=.preview.openbraininstitute.org');
    }
  });

  it('wait for auth-manager before answering, as Lambda freezes once the response is sent', async () => {
    serverConfig.DEPLOYMENT_ENV = 'preview';

    await signIn(await loadAuth(), new CookieJar());

    expect(keycloak.authManagerCalls).toHaveLength(1);
  });
});

describe('the proxy that guards the pages', () => {
  const visit = async (jar: CookieJar) => {
    vi.stubEnv('BETTER_AUTH_SECRET', SECRET);
    vi.stubEnv('BETTER_AUTH_URL', APP);
    vi.stubEnv('PRIMARY_HOSTNAME', '');
    const { proxy } = await import('@/proxy');
    return proxy(
      new NextRequest(`${APP}/app/virtual-lab/explore?panel=data`, {
        headers: { cookie: jar.header },
      })
    );
  };

  afterEach(() => vi.unstubAllEnvs());

  it('lets a signed-in user through without calling anyone', async () => {
    const jar = new CookieJar();
    await signIn(await loadAuth(), jar);
    vi.mocked(fetch).mockClear();

    const response = await visit(jar);

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends a visitor to the log-in page, which returns to the requested page', async () => {
    const response = await visit(new CookieJar());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      `${APP}/app/log-in?callbackUrl=%2Fapp%2Fvirtual-lab%2Fexplore%3Fpanel%3Ddata`
    );
  });

  it('expires the cookies next-auth left, on the preview domain too', async () => {
    const jar = new CookieJarCopy(new CookieJar());
    const legacy = new Response(null);
    for (const name of [
      '__Secure-next-auth.session-token.0',
      '__Secure-next-auth.session-token.1',
      '__Host-next-auth.csrf-token',
      'unrelated',
    ]) {
      legacy.headers.append('set-cookie', `${name}=value`);
    }
    jar.store(legacy);
    vi.stubEnv('AUTH_PROXY_URL', 'https://auth.preview.openbraininstitute.org');

    const response = await visit(jar);

    expect(response.headers.getSetCookie()).toEqual([
      '__Secure-next-auth.session-token.0=; Max-Age=0; Path=/; Secure',
      '__Secure-next-auth.session-token.0=; Max-Age=0; Path=/; Secure; Domain=.preview.openbraininstitute.org',
      '__Secure-next-auth.session-token.1=; Max-Age=0; Path=/; Secure',
      '__Secure-next-auth.session-token.1=; Max-Age=0; Path=/; Secure; Domain=.preview.openbraininstitute.org',
      '__Host-next-auth.csrf-token=; Max-Age=0; Path=/; Secure',
    ]);
  });

  it('adds no cookie for a browser that never used next-auth', async () => {
    const jar = new CookieJar();
    await signIn(await loadAuth(), jar);

    expect((await visit(jar)).headers.getSetCookie()).toEqual([]);
  });

  it('sends a user whose session has expired to the log-in page', async () => {
    const jar = new CookieJar();
    await signIn(await loadAuth(), jar);
    vi.setSystemTime(Date.now() + 11 * 60 * MINUTE);

    expect((await visit(jar)).status).toBe(307);
  });
});

class CookieJarCopy extends CookieJar {
  constructor(source: CookieJar, keep: (name: string) => boolean = () => true) {
    super();
    const response = new Response(null);
    for (const pair of source.header.split('; ')) {
      if (keep(pair.slice(0, pair.indexOf('=')))) response.headers.append('set-cookie', pair);
    }
    this.store(response);
  }
}
