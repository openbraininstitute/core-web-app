'use client';

import Link from 'next/link';
import { ContentForTutorialItem } from '../type';

import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';
import truncateText from '@/util/truncate';

export default function TutorialNavList() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div className="relative mt-12 flex w-full flex-col gap-y-3">
      <Link
        href="/app/documentation/tutorials"
        className="relative flex w-full flex-row items-center"
      >
        <h1 className="text-lg font-bold text-primary-4 after:ml-2">Tutorials</h1>
        <div className="relative top-1 ml-1 block h-px w-full bg-primary-5" />
      </Link>

      <div className="flex flex-col gap-y-2">
        {tutorials.map((tutorial: ContentForTutorialItem) => (
          <Link
            href={`/app/documentation/tutorials/${tutorial.slug}`}
            className="whitespace-nowrap font-sans text-lg font-normal text-white"
            key={tutorial.title}
          >
            {truncateText(tutorial.title, 28)}
          </Link>
        ))}
      </div>
    </div>
  );
}
