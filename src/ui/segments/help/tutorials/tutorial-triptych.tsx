import Link from 'next/link';

import TutorialCard from '@/ui/segments/help/tutorials/tutorial-card';

import { getTutorialContent } from '@/api/sanity/help-tutorial-section/route';
import type { TutorialProps } from '@/components/documentation/type';

export default async function TutorialTriptych() {
  const tutorials = await getTutorialContent();

  return (
    <div className="mt-8 flex w-full flex-col">
      <header className="text-primary-9 mb-4 flex w-full flex-row justify-between">
        <h2 className="text-2xl font-bold">Tutorials</h2>
        <Link href="/help/tutorials" className="font-regular text-lg">
          See all tutorials
        </Link>
      </header>
      <div className="relative grid grid-cols-3 gap-6">
        {tutorials?.tutorialOrder.map((value: TutorialProps) => (
          <TutorialCard key={value.url} content={value} />
        ))}
      </div>
    </div>
  );
}
