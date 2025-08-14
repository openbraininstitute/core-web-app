import TutorialCard from './tutorial-card';

import { useSanityContentForTutorialsList } from '@/components/tutorials-carrousel/hooks';

import { TutorialProps } from '@/components/documentation/type';

export default function TutorialSection() {
  const tutorials = useSanityContentForTutorialsList();

  return (
    <div>
      <div className="relative grid grid-cols-3 gap-6">
        {tutorials?.tutorialOrder.map((value: TutorialProps) => (
          <TutorialCard key={value.url} content={value} />
        ))}
      </div>
    </div>
  );
}
