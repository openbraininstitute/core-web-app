import NextImage from 'next/image';

import type { FullScreenImageValue } from '../NewsPage';

export default function SimpleImage({ value }: { value: FullScreenImageValue }) {
  return (
    <div className="relative my-12 w-full">
      <NextImage
        src={value.image}
        alt={value.altText || 'Simple Image'}
        width={1920}
        height={1080}
        className="h-auto w-full"
      />
    </div>
  );
}
