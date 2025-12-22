import SanityClient from 'next-sanity-client';

import tiersQuery from './tiers.query.groq';

import { config } from '@/config';

import { ContentForPricing } from '@/components/LandingPage/content/pricing';

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
