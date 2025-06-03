import { ContentForTutorialItem } from '@/components/tutorials-carrousel/hooks';
import Image from 'next/image';
import Link from 'next/link';
import PlaceholderImage from '../img/thumbnail_placeholder.jpg';

export default function SingleTutorialCard({ content }: { content: ContentForTutorialItem }) {
  return (
    <Link
      href={`/documentation/tutorials/${content.slug}`}
      className="grid grid-cols-2 gap-x-2 overflow-hidden rounded-lg bg-white p-4 text-primary-9"
    >
      <div className="overflow-hiddden h-full w-full rounded-md shadow-lg">
        <Image src={PlaceholderImage} alt={content.title} className="h-auto w-full" />
      </div>
      <div className="w-full">
        <h2 className="mb-1 text-2xl font-bold leading-tight">{content.title}</h2>
        <p className="text-base font-normal">{content.description}</p>
      </div>
      <div />
    </Link>
  );
}
