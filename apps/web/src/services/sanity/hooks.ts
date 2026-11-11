import React from 'react';

import { getClient } from '@/services/sanity/client';
import { isUndefined } from '@/util/type-guards';
import { log, logError } from '@/utils/logger';

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
  if (data === null) return null;

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

async function fetchSanityContent(query: string): Promise<unknown> {
  const client = getClient();

  try {
    const data = await client.fetch(query);
    return data;
  } catch (ex) {
    logError('Unable to connect to Sanity!', ex);
    return null;
  }
}
