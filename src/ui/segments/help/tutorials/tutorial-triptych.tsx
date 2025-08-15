import Link from 'next/link';
import TutorialCard from './tutorial-card';

import { TutorialProps } from '@/components/documentation/type';
import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';

export default function TutorialTriptych() {
  const tutorials = useSanityContentForTutorialsList();

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
