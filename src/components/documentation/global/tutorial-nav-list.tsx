'use client';

import Link from 'next/link';

import {
  ContentForTutorialItem,
  useSanityContentForTutorialsList,
} from '@/components/tutorials-carrousel/hooks';
import truncateText from '@/util/truncate';

export default function TutorialNavList() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div className="relative mt-12 flex w-full flex-col gap-y-3">
      <Link
        href="/app/documentation/tutorials"
        className="relative flex w-full flex-row items-center"
      >
        <h1 className="text-primary-4 text-base font-bold after:ml-2">Tutorials</h1>
        <div className="bg-primary-5 relative top-1 ml-1 block h-px w-full" />
      </Link>

      <div className="flex flex-col gap-y-2">
        {tutorials.map((tutorial: ContentForTutorialItem) => (
          <Link
            href={`/app/documentation/tutorials/${tutorial.slug}`}
            className="font-sans text-base font-normal text-white"
            key={tutorial.title}
          >
            {truncateText(tutorial.title, 28)}
          </Link>
        ))}
      </div>
    </div>
  );
}
