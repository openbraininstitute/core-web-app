import React from 'react';
import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { EnumSection } from '../sections/sections';
import { getSection } from '../utils';
import { ContentForRichText, isContentForRichText } from './types';
import { logError } from '@/util/logger';
import { isUndefined } from '@/util/type-guards';

export const client = createClient({
  projectId: 'fgi7eh1v',
  dataset: 'production',
  apiVersion: '2023-03-25',
  useCdn: process.env.NODE_ENV === 'production',
});

const builder = imageUrlBuilder(client);

export const urlFor = (source: SanityImageSource) => {
  return builder.image(source);
};

/**
 * @returns The expected object, or:
 *
 * - `undefined` if the query has not finished yet.
 * - `null` if an error occured.
 */
export function useSanity<T>(
  query: string,
  typeGuard: (data: unknown) => data is T
): T | undefined | null {
  try {
    const data = useSanityContent(query);
    if (isUndefined(data)) return undefined;

    if (typeGuard(data)) return data;

    logError('This Sanity query', query);
    logError('returned a data of an unexpected type:', data);
    return null;
  } catch (ex) {
    logError('There was an exception in this Sanity query:', query);
    logError(ex);
    return null;
  }
}

export function useSanityContentRTF(sectionIndex: EnumSection): ContentForRichText {
  const section = getSection(sectionIndex);
  // In Sanity, we use only the last word of the actual slug.
  // `/welcome/home` is referenced as `home` in Sanity.
  const slug = section.slug.split('/').pop();
  const query = `*[_type=="pages"][slug.current=="${slug}"][0]{
  content[] {
    ...,
    "image": image.asset->{
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height,
    },
    "background": backgroundImage.asset->{
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height,
    },
    "button": {
      "label": buttonLabel,
      "link": internalLink->slug.current
    },
    content[] {
      ...,
      'imageURL': image.asset->url,
      'imageWidth': image.asset->metadata.dimensions.width,
      'imageHeight': image.asset->metadata.dimensions.height,
    }
  }
}.content`;
  return useSanity(query, isContentForRichText) ?? [];
}

/**
 * Query Sanity without checking the returned format.
 * This is an utility function used by more specific ones.
 * Please use `useSanityContentTyped()` instead.
 *
 * @see https://open-brain-institute.sanity.studio
 */
function useSanityContent(query: string): unknown {
  const [content, setContent] = React.useState<unknown>(undefined);
  React.useEffect(() => {
    const action = async () => {
      try {
        const data = await client.fetch(query);
        setContent(data);
      } catch (ex) {
        logError('Unable to connect to Sanity!', ex);
        setContent(null);
      }
    };
    action();
  }, [setContent, query]);
  return content;
}
