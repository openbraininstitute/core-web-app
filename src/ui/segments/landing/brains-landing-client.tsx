'use client';

import { BrainsWalkthroughPage } from '@/ui/segments/project/brains-walkthrough/brains-walkthrough-page';

/**
 * The Fly brain walkthrough as the public landing. It has no workspace of its own, so Enter the
 * platform and its end lead to the app's entry, where signing in picks a lab.
 */
export function BrainsLandingClient() {
  return <BrainsWalkthroughPage walking={false} enterHref="/app/virtual-lab" />;
}

export default BrainsLandingClient;
