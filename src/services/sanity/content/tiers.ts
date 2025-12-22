import type { ContentForPricing } from '@/components/LandingPage/content/pricing';
import { getClient } from '@/services/sanity/client';
import tiersQuery from '@/services/sanity/queries/tiers.query.groq';
import { logError } from '@/util/logger';

export async function getSanityTiers(): Promise<ContentForPricing | undefined | null> {
  try {
    const data = await getClient().fetch<ContentForPricing>(
      tiersQuery,
      {},
      {
        cache: 'force-cache',
        next: { revalidate: 3600 },
      }
    );
    return data;
  } catch (ex) {
    logError('Failed to fetch Sanity tiers:', ex);
    return null;
  }
}
