import SanityClient from 'next-sanity-client';
import type { ContentForPricing } from '@/components/LandingPage/content/pricing';

import { config } from '@/config';
import tiersQuery from './tiers.query.groq';

let cachedClient: SanityClient | null = null;

export function getClient(): SanityClient {
  if (cachedClient) return cachedClient;

  cachedClient = new SanityClient({
    projectId: 'fgi7eh1v',
    dataset: config.SANITY_DATASET,
    apiVersion: '2023-03-25',
    useCdn: process.env.NODE_ENV === 'production',
    queries: {
      tiers: tiersQuery,
    },
  });

  return cachedClient;
}

export const getSanityTiers = () =>
  getClient().createApiUtil<ContentForPricing | undefined | null>('tiers');
