import { describe, expect, it } from 'vitest';

import {
  getSharedCookieDomain,
  isAccessTokenDue,
  resolveAuthEnv,
  resolveAuthStatus,
  toAuthSession,
} from '@/features/auth/helpers';
import { AuthSessionError, AuthStatus } from '@/features/auth/types';

const user = {
  name: 'Ada',
  email: 'ada@example.org',
  subject: 'subject-1',
  username: 'ada',
  identityProvider: null,
};

describe('toAuthSession', () => {
  it('uses the Keycloak subject as the user id', () => {
    const session = toAuthSession(user, {
      accessToken: 'access',
      idToken: 'id',
      expiresAt: new Date('2026-11-23T11:00:00Z'),
    });

    expect(session).toEqual({
      user: {
        id: 'subject-1',
        name: 'Ada',
        email: 'ada@example.org',
        username: 'ada',
        identityProvider: undefined,
      },
      accessToken: 'access',
      idToken: 'id',
      expires: '2026-11-23T11:00:00.000Z',
      error: undefined,
    });
  });

  it('asks for a new sign-in when there are no tokens', () => {
    expect(toAuthSession(user, null)).toMatchObject({
      accessToken: '',
      error: AuthSessionError.RefreshAccessToken,
    });
  });
});

describe('isAccessTokenDue', () => {
  const now = Date.parse('2026-11-23T10:00:00Z');

  it('is due twenty minutes before the token expires, not earlier', () => {
    expect(isAccessTokenDue(new Date(now + 20 * 60 * 1000 + 1), now)).toBe(false);
    expect(isAccessTokenDue(new Date(now + 20 * 60 * 1000), now)).toBe(true);
    expect(isAccessTokenDue(new Date(now - 1), now)).toBe(true);
  });
});

describe('resolveAuthStatus', () => {
  it('is loading only while nobody has answered yet', () => {
    expect(resolveAuthStatus(undefined)).toBe(AuthStatus.Loading);
    expect(resolveAuthStatus(null)).toBe(AuthStatus.Unauthenticated);
    expect(resolveAuthStatus(toAuthSession(user, null))).toBe(AuthStatus.Authenticated);
  });
});

describe('getSharedCookieDomain', () => {
  it('is the parent domain the preview deployments and the auth proxy share', () => {
    expect(getSharedCookieDomain('https://auth.preview.openbraininstitute.org')).toBe(
      '.preview.openbraininstitute.org'
    );
    expect(getSharedCookieDomain('https://a.b.preview.openbraininstitute.org/path')).toBe(
      '.preview.openbraininstitute.org'
    );
  });
});

describe('resolveAuthEnv', () => {
  it('prefers the Better Auth names and still reads the NextAuth ones', () => {
    expect(resolveAuthEnv({ NEXTAUTH_SECRET: 'old', NEXTAUTH_URL: 'https://old.test' })).toEqual({
      secret: 'old',
      baseURL: 'https://old.test',
    });
    expect(
      resolveAuthEnv({
        BETTER_AUTH_SECRET: 'new',
        BETTER_AUTH_URL: 'https://new.test',
        NEXTAUTH_SECRET: 'old',
        NEXTAUTH_URL: 'https://old.test',
      })
    ).toEqual({ secret: 'new', baseURL: 'https://new.test' });
  });
});
