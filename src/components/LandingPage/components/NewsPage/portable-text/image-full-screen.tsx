import Image from 'next/image';
import type { FullScreenImageValue } from '../NewsPage';

export default function ImageFullScreen({ value }: { value: FullScreenImageValue }) {
  return (
    <div className="relative my-12 w-full">
      <Image
        src={value.image}
        alt={value.altText || 'Full Screen Image'}
        width={1920}
        height={1080}
        className="h-auto w-full"
      />
    </div>
  );
}
