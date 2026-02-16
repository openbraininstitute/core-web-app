import { createClient, type QueryParams, type SanityClient } from 'next-sanity';

import { config } from '@/config';

export const DEFAULT_OPTIONS = { next: { revalidate: 3600 } };

let cachedClient: SanityClient | null = null;

function getBaseClient(): SanityClient {
  if (cachedClient) return cachedClient;

  cachedClient = createClient({
    projectId: config.SANITY_PROJECT_ID,
    dataset: config.SANITY_DATASET,
    perspective: 'published',
    apiVersion: '2023-03-25',
    useCdn: process.env.NODE_ENV === 'production',
  });

  return cachedClient;
}

export function getClient() {
  const client = getBaseClient();

  return {
    fetch: <T>(query: string, params: QueryParams = {}, options = DEFAULT_OPTIONS) =>
      client.fetch<T>(query, params, options),
  };
}
