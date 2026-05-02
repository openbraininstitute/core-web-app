import FeaturesContent from '@/ui/segments/help/features/content';
import FeaturesNavigation from '@/ui/segments/help/features/navigation';

export default function FeaturesSection({ slot }: { slot?: 'nav' | 'content' } = {}) {
  if (slot === 'nav') {
    return (
      <div className="border-neutral-2 bg-background w-full overflow-y-auto rounded-2xl border p-4">
        <FeaturesNavigation />
      </div>
    );
  }

  if (slot === 'content') {
    return (
      <div className="mb-32 h-full max-h-[calc(100vh-18rem)] w-full overflow-y-auto p-4">
        <FeaturesContent />
      </div>
    );
  }

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
