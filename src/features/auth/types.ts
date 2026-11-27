import type { getAccountCookie } from 'better-auth/cookies';
import type { ReactNode } from 'react';

export const AuthStatus = {
  Authenticated: 'authenticated',
  Loading: 'loading',
  Unauthenticated: 'unauthenticated',
} as const;

export type TAuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];

export const AuthSessionError = {
  RefreshAccessToken: 'RefreshAccessTokenError',
} as const;

export type TAuthSessionError = (typeof AuthSessionError)[keyof typeof AuthSessionError];

export type TAuthUser = {
  /** The Keycloak subject. */
  id: string;
  name: string;
  email: string;
  username: string;
  identityProvider?: string;
};

export type TAuthSession = {
  user: TAuthUser;
  accessToken: string;
  idToken: string;
  /** ISO date at which the access token expires. */
  expires: string;
  error?: TAuthSessionError;
};

export type TAuthSessionProviderProps = {
  session: TAuthSession | null;
  children: ReactNode;
};

export type TUseAuthSession = {
  data: TAuthSession | null;
  status: TAuthStatus;
};

/** The user fields Better Auth keeps in the session cookie, as filled from the Keycloak profile. */
export type TStoredAuthUser = {
  name: string;
  email: string;
  subject: string;
  username: string;
  identityProvider?: string | null;
};

export type TAccountTokens = {
  accessToken: string;
  idToken: string;
  expiresAt: Date;
  error?: TAuthSessionError;
};

export type TKeycloakProfile = {
  sub: string;
  preferred_username?: string;
  identity_provider?: string;
};

export type TAuthEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
};

export type TEndpointContext = Parameters<typeof getAccountCookie>[0];
export type TOAuthProvider = TEndpointContext['context']['socialProviders'][number];
export type TRefreshedTokens = Awaited<
  ReturnType<NonNullable<TOAuthProvider['refreshAccessToken']>>
>;
export type TTokenPair = { accessToken?: string | null; refreshToken?: string | null };
