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
// out: a session whose refresh token died still decrypts, so it counts too. A token Keycloak
// rejects while the session still looks valid throws instead: log-in would send that session
// straight back here, so the error page offers a fresh sign-in.
async function resolveCapabilities(fresh: boolean): Promise<OperatorCapabilities | null> {
  const session = await auth();
  if (!session || session.error === 'RefreshAccessTokenError') return null;
  const groups = await getKeycloakGroups(session, { fresh });
  if (!groups) throw new Error('keycloak rejected the access token');
  return deriveCapabilities(groups);
}

const currentCapabilities = cache(() => resolveCapabilities(false));

/**
 * A 401, 403 or 503 JSON reply for a route handler, or `null` to let the request through.
 * `fresh` skips the groups cache, so a write never runs on access the operator has just lost.
 */
export async function capabilityDenial(
  need: CapabilityPath,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<Response | null> {
  let capabilities: OperatorCapabilities | null;
  try {
    capabilities = await (fresh ? resolveCapabilities(true) : currentCapabilities());
  } catch {
    if (fresh) {
      return Response.json(
        { message: "Couldn't confirm your access. Try again, or sign in again." },
        { status: 503 }
      );
    }
    capabilities = null;
  }
  if (!capabilities) return Response.json({ message: 'Sign in again' }, { status: 401 });
  if (!hasCapability(capabilities, need)) {
    return Response.json({ message: "Your account isn't allowed to do this" }, { status: 403 });
  }
  return null;
}

export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const capabilities = await currentCapabilities();
  if (!capabilities) redirect(`/app/log-in?callbackUrl=${encodeURIComponent(ADMIN_ROOT)}`);
  if (!hasCapability(capabilities, need)) redirect(`${ADMIN_ROOT}/forbidden`);

  return capabilities;
}
