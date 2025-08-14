import FeaturesContent from './content';
import FeaturesNavigation from './navigation';

export default function FeaturesSection() {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <FeaturesNavigation />
      <FeaturesContent />
    </div>
  );
}
