/* eslint-disable no-console */
import React from 'react';
import { createClient } from 'next-sanity';

import queryContentRTF from '@/components/LandingPage/content/content.groq';
import { ContentForRichText } from '@/components/LandingPage/content';
import { Section } from '@/components/LandingPage/constants';
import { isUndefined } from '@/util/type-guards';
import { logError } from '@/util/logger';

const client = createClient({
  projectId: 'fgi7eh1v',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  perspective: 'published',
  apiVersion: '2023-03-25',
  useCdn: process.env.NODE_ENV === 'production',
});

/**
 * @returns The expected object, or:
 *
 * - `undefined` if the query has not finished yet.
 * - `null` if an error occurred.
 */
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
    throw Error('Type guard rejected this type, but without any explanation!');
  } catch (ex) {
    console.log('The following Sanity GROQ query returned a data of unexpected type:');
    console.log(`%c${query}`, 'font-family: monospace; color: #0f0; background: #000');
    console.log(data);
    const msg = ex instanceof Error ? ex.message : `${ex}`;
    console.log(`%c${msg}`, 'font-weight: bold; color: #fff; background: #b00');
    return null;
  }
}

/**
 * Query Sanity without checking the returned format.
 * This is an utility function used by more specific ones.
 * Please use `useSanityContentTyped()` instead.
 *
 * @see https://open-brain-institute.sanity.studio
 */
export async function fetchSanityContent(query: string): Promise<unknown> {
  try {
    const data = await client.fetch(
      query,
      {},
      {
        cache: 'no-cache',
      }
    );

    return data;
  } catch (ex) {
    logError('Unable to connect to Sanity!', ex);
    return null;
  }
}

export async function fetchSanityPageContent(section: Section): Promise<ContentForRichText> {
  const slug = section.slug.split('/').pop() || '/';

  const query = queryContentRTF.replaceAll('<SLUG>', slug);
  const content = (await fetchSanityContent(query)) as ContentForRichText;

  return content;
}
