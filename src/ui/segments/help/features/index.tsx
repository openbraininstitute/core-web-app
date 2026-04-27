import FeaturesContent from '@/ui/segments/help/features/content';
import FeaturesNavigation from '@/ui/segments/help/features/navigation';

export default function FeaturesSection() {
  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <FeaturesNavigation />
      </div>
      <div className="w-3/4 overflow-y-auto pl-4">
        <FeaturesContent />
      </div>
    </div>
  );
}
