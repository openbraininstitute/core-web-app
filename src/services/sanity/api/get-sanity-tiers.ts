import { getClient } from '@/services/sanity/client';
import tiersQuery from '@/services/sanity/queries/tiers';

import type { ContentForPricing } from '@/components/LandingPage/content/pricing';

export async function getSanityTiers(): Promise<ContentForPricing | undefined | null> {
  try {
    const data = await getClient().fetch<ContentForPricing>(tiersQuery);
    return data;
  } catch {
    return null;
  }
}
