import imageUrlBuilder from '@sanity/image-url';
import client from './client';

interface SanityImageSource {
  asset?: {
    _ref?: string;
    _type?: string;
    url?: string;
  };
  [key: string]: any;
}
const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource): ReturnType<typeof builder.image> {
  return builder.image(source);
}
