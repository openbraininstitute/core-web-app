/**
 * App-facing session type, preserving the exact shape the codebase consumed
 * under next-auth so the ~35 session consumers keep working unchanged.
 * The Better Auth server (`customSession`) and the client adapter both produce
 * this shape.
 */
export interface ISessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
  plan?: string[];
  identityProvider?: string;
}

export interface ISession {
  user: ISessionUser;
  accessToken: string;
  idToken: string;
  /** Set to `REFRESH_ACCESS_TOKEN_ERROR` when the Keycloak refresh fails. */
  error?: string;
}

export type TSessionOrNull = ISession | null;

/** Alias for the session user, replacing next-auth's `User` type for consumers
 * that typed a parameter/prop as the authenticated user. */
export type TUser = ISessionUser;
