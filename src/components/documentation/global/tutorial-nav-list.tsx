'use client';

import {
  ContentForTutorialItem,
  useSanityContentForTutorialsList,
} from '@/components/tutorials-carrousel/hooks';
import truncateText from '@/util/truncate';

export default function TutorialNavList() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div className="relative mt-12 flex w-full flex-col gap-y-3">
      <header className="relative flex w-full flex-row items-center">
        <h1 className="text-base font-bold text-primary-4 after:ml-2">Tutorials</h1>
        <div className="relative top-1 ml-1 block h-px w-full bg-primary-5" />
      </header>

      <div className="flex flex-col gap-y-2">
        {tutorials.map((tutorial: ContentForTutorialItem) => (
          <h2 className="font-sans text-base font-normal text-white" key={tutorial.title}>
            {truncateText(tutorial.title, 28)}
          </h2>
        ))}
      </div>
    </div>
  );
}
