import TutorialContent from '@/ui/segments/help/tutorials/content';
import TutorialNavigation from '@/ui/segments/help/tutorials/navigation';

export default function TutorialSection() {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <TutorialNavigation />
      <TutorialContent />
    </div>
  );
}
