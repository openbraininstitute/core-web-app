// Who is signed in, and the lab and project they work in. The session is the app's (next-auth,
// src/auth); the identity the services trust is its Keycloak access token, kept current in memory
// by useSessionState, so API calls and the collaboration socket never wait on a request.

import { isNil, isNotNil, uniqBy } from 'es-toolkit';
import { signIn as nextAuthSignIn } from 'next-auth/react';

import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/ui/initials';
import { getClientSession } from '@/hooks/session';

export const PROVIDER = 'keycloak';

// The Keycloak access token of the current session.
export async function accessToken(): Promise<string> {
  const session = await getClientSession();
  if (isNil(session?.accessToken)) throw new Error('Not signed in');
  return session.accessToken;
}

// Keycloak, then back to the address the person asked for.
export const signIn = (): Promise<unknown> =>
  nextAuthSignIn(PROVIDER, { callbackUrl: location.href });

export interface IProject {
  readonly virtualLabId: string;
  readonly projectId: string;
}

export interface IMe {
  readonly userId: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
  readonly projects: readonly IProject[];
}

// `/proj/<lab>/<project>/<role>`: the projects the person belongs to (Keycloak groups claim).
const PROJECT_GROUP = /^\/proj\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/[a-z]+$/;

export function projectsOf(groups: readonly string[]): IProject[] {
  const found = groups.flatMap((group) => {
    const match = PROJECT_GROUP.exec(group);
    return isNil(match) ? [] : [{ virtualLabId: match[1] ?? '', projectId: match[2] ?? '' }];
  });
  return uniqBy(found, (p) => p.projectId);
}

type TClaims = Readonly<Record<string, unknown>>;
const isClaims = (value: unknown): value is TClaims => typeof value === 'object' && isNotNil(value);

// The claims of the access token, for display and routing only: every service checks the token's
// signature itself; the browser never decides access from it.
function claimsOf(token: string): TClaims {
  const payload = (token.split('.')[1] ?? '').replaceAll('-', '+').replaceAll('_', '/');
  try {
    const json: unknown = JSON.parse(atob(payload));
    return isClaims(json) ? json : {};
  } catch {
    return {};
  }
}

const textOf = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export function meOf(token: string): IMe {
  const claims = claimsOf(token);
  const userId = textOf(claims['sub']) ?? '';
  const name = textOf(claims['name']) ?? textOf(claims['preferred_username']) ?? userId;
  const groups = claims['groups'];
  return {
    userId,
    name,
    initials: initialsOf(name),
    colour: colourOf(userId),
    projects: projectsOf(Array.isArray(groups) ? groups.map(String) : []),
  };
}
