import { Providers } from '@/app/app/providers';
import { auth } from '@/auth';
import { getAllFlags } from '@/features/feature-flags';

import { BrainsLandingClient } from './brains-landing-client';

/**
 * The platform's public landing: the Fly brain walkthrough (the fly's brain and nerve cord turning),
 * in place of the marketing hero. It mounts the same app providers the walkthrough's 3D views need
 * (feature flags, the session, React Query, Jotai), with whatever session the visitor has — none, for
 * a visitor, so nothing sends them to log in. Enter the platform leads to the app's entry.
 */
export async function BrainsLanding() {
  const session = await auth();
  const flags = await getAllFlags();
  return (
    <Providers session={session} flags={flags}>
      <BrainsLandingClient />
    </Providers>
  );
}

export default BrainsLanding;
