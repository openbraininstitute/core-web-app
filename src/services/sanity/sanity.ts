/* eslint-disable no-console */

import { createClient, type SanityClient } from 'next-sanity';
import React from 'react';
import { config } from '@/config';
import { logError } from '@/util/logger';
import { isUndefined } from '@/util/type-guards';
import { log } from '@/utils/logger';

let cachedClient: SanityClient | null = null;

function getClient(): SanityClient {
  if (cachedClient) return cachedClient;

  cachedClient = createClient({
    projectId: 'fgi7eh1v',
    dataset: config.SANITY_DATASET,
    perspective: 'published',
    apiVersion: '2023-03-25',
    useCdn: process.env.NODE_ENV === 'production',
  });

  return cachedClient;
}

export function useSanity<T>(
  query: string,
  typeGuard: (data: unknown) => data is T
): T | undefined | null {
  const [data, setData] = React.useState<T | undefined | null>(undefined);
  React.useEffect(() => {
    fetchSanity(query, typeGuard)
      .then(setData)
      .catch((ex) => {
        logError('There was an exception in this Sanity query:', query);
        logError(ex);
        setData(null);
      });
  }, [query, typeGuard]);
  return data;
}

export async function fetchSanity<T>(
  query: string,
  typeGuard: (data: unknown) => data is T
): Promise<T | undefined | null> {
  const data = await fetchSanityContent(query);
  if (isUndefined(data)) return undefined;

  try {
    if (typeGuard(data)) return data;
    throw Error('Type guard rejeted this type, but without any explanation!');
  } catch (ex) {
    log('warn', 'The following Sanity GROQ query returned a data of unexpected type:');
    log('log', `%c${query}`, 'font-family: monospace; color: #0f0; background: #000');
    log('log', data);
    const msg = ex instanceof Error ? ex.message : `${ex}`;
    log('log', `%c${msg}`, 'font-weight: bold; color: #fff; background: #b00');
    return null;
  }
}

const cache = new Map<string, unknown>();

async function fetchSanityContent(query: string): Promise<unknown> {
  const fromCache = cache.get(query);
  if (fromCache) return fromCache;

  const client = getClient();

  try {
    const data = await client.fetch(
      query,
      {},
      {
        cache: 'no-cache',
      }
    );
    cache.set(query, data);
    return data;
  } catch (ex) {
    logError('Unable to connect to Sanity!', ex);
    return null;
  }
}
