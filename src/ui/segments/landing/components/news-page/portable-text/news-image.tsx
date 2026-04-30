import NextImage from 'next/image';

import type { FullScreenImageValue } from '../news-page-client';

interface NewsImageProps {
  value: FullScreenImageValue;
  defaultAlt: string;
}

export default function NewsImage({ value, defaultAlt }: NewsImageProps) {
  return (
    <div className="relative my-12 w-full">
      <NextImage
        src={value.image}
        alt={value.altText || defaultAlt}
        width={1920}
        height={1080}
        className="h-auto w-full"
      />
    </div>
  );
}
