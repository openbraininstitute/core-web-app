import React from 'react';
// @ts-ignore
import { createClient } from 'next-sanity';
// @ts-ignore
import imageUrlBuilder from '@sanity/image-url';
// @ts-ignore
import { SanityImageSource } from '@sanity/image-url/lib/types/types';

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
 *
 * @returns
 * @see *[_id=="home"][0]{title}
 */
export function useSanityContent(query = '*[_id=="home"][0]{title}'): unknown {
  const [content, setContent] = React.useState(storageGet(query));
  React.useEffect(() => {
    const action = async () => {
      const data = await client.fetch(query);
      storageSet(query, data);
      setContent(data);
    };
    action();
  }, [setContent, query]);
  return content;
}

function storageGet(id: string): unknown {
  try {
    const text = localStorage.getItem(id);
    return JSON.parse(text ?? 'null');
  } catch (ex) {
    return null;
  }
}

function storageSet(id: string, value: unknown) {
  localStorage.setItem(id, JSON.stringify(value));
}
