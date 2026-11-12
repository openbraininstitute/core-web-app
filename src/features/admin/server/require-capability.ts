import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/auth';

import { deriveCapabilities } from '../capabilities/derive';
import { hasCapability } from '../capabilities/has-capability';
import { ADMIN_ROOT } from '../routes';
import { getKeycloakGroups } from './keycloak-groups';

import type { CapabilityPath, OperatorCapabilities } from '../capabilities/types';

// Per request, because a page and its layout both ask during one render. `null` means logged
// out: a session whose refresh token died still decrypts, so it counts too.
const currentCapabilities = cache(async (): Promise<OperatorCapabilities | null> => {
  const session = await auth();
  if (!session || session.error === 'RefreshAccessTokenError') return null;
  const groups = await getKeycloakGroups(session);
  return groups && deriveCapabilities(groups);
});

export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const capabilities = await currentCapabilities();
  if (!capabilities) redirect(`/app/log-in?callbackUrl=${encodeURIComponent(ADMIN_ROOT)}`);
  if (!hasCapability(capabilities, need)) redirect(`${ADMIN_ROOT}/forbidden`);

  return capabilities;
}
