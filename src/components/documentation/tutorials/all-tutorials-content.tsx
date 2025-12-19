'use client';

import SingleTutorialCard from '@/components/documentation/main/single-tutorial-card';
import type { TutorialProps } from '@/components/documentation/type';
import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';

export default function AllTutorialsContent() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div className="w-full">
      <div className="flex flex-row items-baseline gap-x-3">
        <h1 className="mb-6 text-3xl font-bold text-white">All Tutorials</h1>
        <div className="text-primary-3 text-lg">
          {tutorials?.tutorialOrder.length} tutorials available
        </div>
      </div>
      <div className="relative grid grid-cols-3 gap-6">
        {tutorials?.tutorialOrder.map((value: TutorialProps) => (
          <SingleTutorialCard key={value.url} content={value} />
        ))}
      </div>
    </div>
  );
}
