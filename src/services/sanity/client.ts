import { createClient, type SanityClient } from 'next-sanity';

import { config } from '@/config';
import { logError } from '@/util/logger';
import { isUndefined } from '@/util/type-guards';
import { log } from '@/utils/logger';

let cachedClient: SanityClient | undefined;

export function getClient(): SanityClient {
  cachedClient ??= createClient({
    projectId: config.SANITY_PROJECT_ID,
    dataset: config.SANITY_DATASET,
    perspective: 'published',
    apiVersion: '2023-03-25',
    useCdn: process.env.NODE_ENV === 'production',
  });

  return cachedClient;
}

export async function fetchSanity<T>(
  query: string,
  typeGuard: (data: unknown) => data is T
): Promise<T | undefined | null> {
  const data = await fetchSanityContent(query);
  if (isUndefined(data)) return undefined;

  try {
    if (typeGuard(data)) return data;
    throw Error('Type guard rejected this type, but without any explanation!');
  } catch (ex) {
    log('warn', 'The following Sanity GROQ query returned a data of unexpected type:');
    log('log', `%c${query}`, 'font-family: monospace; color: #0f0; background: #000');
    log('log', data);
    const msg = ex instanceof Error ? ex.message : `${ex}`;
    log('log', `%c${msg}`, 'font-weight: bold; color: #fff; background: #b00');
    return null;
  }
}

async function fetchSanityContent(query: string): Promise<unknown> {
  const client = getClient();

  try {
    const data = await client.fetch(
      query,
      {},
      {
        cache: 'force-cache',
        next: { revalidate: 3600 },
      }
    );
    return data;
  } catch (ex) {
    logError('Unable to connect to Sanity!', ex);
    return null;
  }
}
