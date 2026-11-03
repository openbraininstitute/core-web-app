import { redirect } from 'next/navigation';

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

// Every admin page calls this as well as the layout: layouts don't re-run on client-side
// navigation, so the layout alone doesn't guard a page.
export async function requireCapability(need: CapabilityPath): Promise<OperatorCapabilities> {
  const session = await auth();
  if (!session) redirect('/app/log-in');

  const capabilities = await resolveCapabilities(session);
  if (!hasCapability(capabilities, need)) redirect('/app/admin/forbidden');

  return capabilities;
}
