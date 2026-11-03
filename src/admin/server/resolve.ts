import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/auth';

import { deriveCapabilities, hasCapability } from '../capabilities/derive';
import { getUserGroups } from './groups';

import type { Session } from 'next-auth';
import type { CapabilityPath, OperatorCapabilities } from '../capabilities/types';

export async function resolveCapabilities(
  session: Session | null | undefined,
  options?: { allowStale?: boolean }
): Promise<OperatorCapabilities> {
  const groups = await getUserGroups(session, options);
  return deriveCapabilities(groups);
}

// Per request, because a page and its layout both ask during one render.
const currentCapabilities = cache(async () => {
  const session = await auth();
  // A session whose refresh token died still decrypts, but it is logged out.
  if (!session || session.error === 'RefreshAccessTokenError') return null;
  return resolveCapabilities(session);
});

// Every admin page calls this as well as the layout: layouts don't re-run on client-side
// navigation, so the layout alone doesn't guard a page.
export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const capabilities = await currentCapabilities();
  if (!capabilities) redirect('/app/log-in');
  if (!hasCapability(capabilities, need)) redirect('/app/admin/forbidden');

  return capabilities;
}
