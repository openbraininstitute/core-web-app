import { createClient, type QueryParams, type SanityClient } from 'next-sanity';

import { config } from '@/config';

export const DEFAULT_OPTIONS = { next: { revalidate: 3600 } };

let cachedClient: SanityClient | null = null;
let cachedProductionClient: SanityClient | null = null;

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

function getBaseProductionClient(): SanityClient {
  if (cachedProductionClient) return cachedProductionClient;

  cachedProductionClient = createClient({
    projectId: config.SANITY_PROJECT_ID,
    dataset: 'production',
    perspective: 'published',
    apiVersion: '2023-03-25',
    useCdn: process.env.NODE_ENV === 'production',
  });

  return cachedProductionClient;
}

export function getClient() {
  const client = getBaseClient();

  return {
    fetch: <T>(query: string, params: QueryParams = {}, options = DEFAULT_OPTIONS) =>
      client.fetch<T>(query, params, options),
  };
}

export function getProductionClient() {
  const client = getBaseProductionClient();

  return {
    fetch: <T>(query: string, params: QueryParams = {}, options = DEFAULT_OPTIONS) =>
      client.fetch<T>(query, params, options),
  };
}
