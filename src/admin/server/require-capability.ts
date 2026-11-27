import { getAuthSession } from '@/features/auth/session';
import { AuthSessionError } from '@/features/auth/types';
import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { deriveCapabilities } from '../capabilities/derive';
import { hasCapability } from '../capabilities/has-capability';
import { ADMIN_ROOT } from '../routes';
import { getKeycloakGroups } from './keycloak-groups';

import type { CapabilityPath, OperatorCapabilities, TOperator } from '../capabilities/types';

// Per request, because a page and its layout both ask during one render. `null` means logged
// out: a session whose refresh token died still decrypts, so it counts too. A token Keycloak
// rejects while the session still looks valid throws instead: log-in would send that session
// straight back here, so the error page offers a fresh sign-in.
class TokenRejectedError extends Error {}

async function resolveAccess(fresh: boolean) {
  const session = await getAuthSession();
  if (!session || session.error === AuthSessionError.RefreshAccessToken) return null;
  const groups = await getKeycloakGroups(session, { fresh });
  if (!groups) throw new TokenRejectedError('keycloak rejected the access token');
  return { session, capabilities: deriveCapabilities(groups) };
}

const currentCapabilities = cache(
  async (): Promise<OperatorCapabilities | null> =>
    (await resolveAccess(false))?.capabilities ?? null
);

const denied = (status: number, message: string) => Response.json({ message }, { status });

function denialFor(capabilities: OperatorCapabilities | null, need: CapabilityPath) {
  if (!capabilities) return denied(401, 'Sign in again');
  if (!hasCapability(capabilities, need))
    return denied(403, "Your account isn't allowed to do this");
  return null;
}

/** A 401 or 403 reply, or `null` to let it through. */
export async function capabilityDenial(need: CapabilityPath): Promise<Response | null> {
  return denialFor(await currentCapabilities().catch(() => null), need);
}

/** For a write: access checked past the groups cache, and the operator who asks. */
export async function writeAccess(
  need: CapabilityPath
): Promise<{ denial: Response } | { operator: TOperator }> {
  let access: Awaited<ReturnType<typeof resolveAccess>>;
  try {
    access = await resolveAccess(true);
  } catch (error) {
    return {
      denial:
        error instanceof TokenRejectedError
          ? denied(401, 'Sign in again')
          : denied(503, "Couldn't confirm your access. Try again, or sign in again."),
    };
  }
  const denial = denialFor(access?.capabilities ?? null, need);
  if (denial) return { denial };
  const user = access?.session.user;
  if (!user?.id) return { denial: denied(401, 'Sign in again') };
  return { operator: { id: user.id, username: user.username } };
}

export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const capabilities = await currentCapabilities();
  if (!capabilities) redirect(`/app/log-in?callbackUrl=${encodeURIComponent(ADMIN_ROOT)}`);
  if (!hasCapability(capabilities, need)) redirect(`${ADMIN_ROOT}/forbidden`);

  return capabilities;
}
