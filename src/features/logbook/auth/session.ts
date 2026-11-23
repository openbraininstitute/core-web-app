import { isNil, isNotNil, uniqBy } from 'es-toolkit';

import { colourOf } from '@/features/logbook/blocks/colour';
import { initialsOf } from '@/features/logbook/helpers';
import { getClientSession } from '@/hooks/session';

import type { IMe, IProject, TClaims } from '@/features/logbook/types';

export const SessionStatus = { Authenticated: 'authenticated', Loading: 'loading' } as const;

export async function accessToken(): Promise<string> {
  const session = await getClientSession();
  if (isNil(session?.accessToken)) throw new Error('Not signed in');
  return session.accessToken;
}

export const signIn = (): void => {
  const back = `${location.pathname}${location.search}`;
  location.assign(`/app/log-in?callbackUrl=${encodeURIComponent(back)}`);
};

const PROJECT_GROUP = /^\/proj\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/[a-z]+$/;

export function projectsOf(groups: readonly string[]): IProject[] {
  const found = groups.flatMap((group) => {
    const match = PROJECT_GROUP.exec(group);
    return isNil(match) ? [] : [{ virtualLabId: match[1] ?? '', projectId: match[2] ?? '' }];
  });
  return uniqBy(found, (p) => p.projectId);
}

const isClaims = (value: unknown): value is TClaims => typeof value === 'object' && isNotNil(value);

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
