import TutorialCard from '@/ui/segments/help/tutorials/tutorial-card';

import { getTutorialContent } from '@/api/sanity/help-tutorial-section/route';

import type { TutorialProps } from '@/components/documentation/type';

export default async function TutorialSection() {
  const tutorials = await getTutorialContent();

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
