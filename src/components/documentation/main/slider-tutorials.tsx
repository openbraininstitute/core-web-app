'use client';

import Link from 'next/link';

// import { ContentForTutorialItem } from '../type';
// import SingleTutorialCard from './single-tutorial-card';

import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';

import SingleTutorialCard from './single-tutorial-card';

import type { TutorialProps } from '../type';

export default function SliderTutorial() {
  const tutorials = useSanityContentForTutorialsList();

  const content =
    tutorials && !Array.isArray(tutorials) && 'tutorialOrder' in tutorials
      ? tutorials.tutorialOrder
      : [];

  return (
    <div className="w-full">
      <div className="mb-3 flex w-full flex-row items-center justify-between">
        <h1 className="text-lg font-bold text-white">Our latest video tutorials</h1>
        <Link
          href="/app/documentation/tutorials"
          className="text-sm font-semibold text-white hover:underline"
        >
          See all tutorials
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-x-4">
        {content.map((tutorial: TutorialProps) => (
          <SingleTutorialCard key={tutorial.title} content={tutorial} />
        ))}
      </div>
    </div>
  );
}
