import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/auth';

import { deriveCapabilities } from '../capabilities/derive';
import { hasCapability } from '../capabilities/has-capability';
import { ADMIN_ROOT } from '../routes';
import { getKeycloakGroups } from './keycloak-groups';

import type { Session } from 'next-auth';
import type { CapabilityPath, OperatorCapabilities } from '../capabilities/types';

// `null` means logged out. A session whose refresh token died still decrypts, so it counts too.
export async function resolveCapabilities(
  session: Session | null
): Promise<OperatorCapabilities | null> {
  if (!session || session.error === 'RefreshAccessTokenError') return null;
  const groups = await getKeycloakGroups(session);
  return groups && deriveCapabilities(groups);
}

// Per request, because a page and its layout both ask during one render.
const currentCapabilities = cache(async () => resolveCapabilities(await auth()));

// Every admin page calls this as well as the layout: layouts don't re-run on client-side
// navigation, so the layout alone doesn't guard a page.
export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const capabilities = await currentCapabilities();
  if (!capabilities) redirect(`/app/log-in?callbackUrl=${encodeURIComponent(ADMIN_ROOT)}`);
  if (!hasCapability(capabilities, need)) redirect(`${ADMIN_ROOT}/forbidden`);

  return capabilities;
}
