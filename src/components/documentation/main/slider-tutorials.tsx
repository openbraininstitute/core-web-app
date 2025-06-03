'use client';

import {
  ContentForTutorialItem,
  useSanityContentForTutorialsList,
} from '@/components/tutorials-carrousel/hooks';
import Link from 'next/link';
import SingleTutorialCard from './single-tutorial-card';

export default function SliderTutorial() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div className="w-full">
      <div className="mb-3 flex w-full flex-row items-center justify-between">
        <h1 className="text-lg font-bold text-white">Our latest video tutorials</h1>
        <Link
          href="/documentation/tutorials"
          className="text-sm font-semibold text-white hover:underline"
        >
          See all tutorials
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        {tutorials.slice(0, 2).map((tutorial: ContentForTutorialItem) => (
          <SingleTutorialCard key={tutorial.title} content={tutorial} />
        ))}
      </div>
    </div>
  );
}
