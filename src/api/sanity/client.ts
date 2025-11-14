import SanityClient from 'next-sanity-client';

import tiersQuery from './tiers.query.groq';

import { config } from '@/config';

import { ContentForPricing } from '@/components/LandingPage/content/pricing';

export const client = new SanityClient({
  projectId: 'fgi7eh1v',
  dataset: config.SANITY_DATASET,
  apiVersion: '2023-03-25',
  useCdn: process.env.NODE_ENV === 'production',
  queries: {
    tiers: tiersQuery,
  },
});

export const getSanityTiers = client.createApiUtil<ContentForPricing | undefined | null>('tiers');
