import SanityClient from 'next-sanity-client';

import tiersQuery from './tiers.query.groq';

import { env } from '@/env';

import { ContentForPricing } from '@/components/LandingPage/content/pricing';

const client = new SanityClient({
  projectId: 'fgi7eh1v',
  dataset: env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2023-03-25',
  useCdn: process.env.NODE_ENV === 'production',
  queries: {
    tiers: tiersQuery,
  },
});

export const getSanityTiers = client.createApiUtil<ContentForPricing | undefined | null>('tiers');

export default client;
