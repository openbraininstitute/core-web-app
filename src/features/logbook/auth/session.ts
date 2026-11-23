import { isNil, isNotNil, uniqBy } from 'es-toolkit';

import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/helpers';
import { getClientSession } from '@/hooks/session';

/** next-auth's `useSession().status` values. */
export const SessionStatus = { Authenticated: 'authenticated', Loading: 'loading' } as const;

export async function accessToken(): Promise<string> {
  const session = await getClientSession();
  if (isNil(session?.accessToken)) throw new Error('Not signed in');
  return session.accessToken;
}

// Through the app's sign-in page, so preview deployments take the proxy detour; then back here.
export const signIn = (): void => {
  const back = `${location.pathname}${location.search}`;
  location.assign(`/app/log-in?callbackUrl=${encodeURIComponent(back)}`);
};

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

// Keycloak group `/proj/<lab>/<project>/<role>`: a project the person is in.
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

// Display and routing only: services check the signature, the browser never decides access.
function claimsOf(token: string): TClaims {
  const payload = (token.split('.')[1] ?? '').replaceAll('-', '+').replaceAll('_', '/');
  try {
    // atob gives one char per byte; the claims are UTF-8.
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    const json: unknown = JSON.parse(new TextDecoder().decode(bytes));
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
