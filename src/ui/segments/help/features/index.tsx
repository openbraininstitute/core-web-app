import FeaturesContent from '@/ui/segments/help/features/content';
import FeaturesNavigation from '@/ui/segments/help/features/navigation';

export default function FeaturesSection() {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <FeaturesNavigation />
      <FeaturesContent />
    </div>
  );
}
