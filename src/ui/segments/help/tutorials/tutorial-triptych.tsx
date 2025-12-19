import { getTutorialContent } from '@/api/sanity/help-tutorial-section/route';
import type { TutorialProps } from '@/components/documentation/type';
import TutorialCard from '@/ui/segments/help/tutorials/tutorial-card';

export default async function TutorialTriptych() {
  const tutorials = await getTutorialContent();

  return (
    <div className="mt-8 flex w-full flex-col">
      <h2 className="text-primary-9 mb-4 text-2xl font-bold">Tutorials</h2>

      <div className="relative grid grid-cols-3 gap-6">
        {tutorials?.tutorialOrder.map((value: TutorialProps) => (
          <TutorialCard key={value.url} content={value} />
        ))}
      </div>
    </div>
  );
}
