import FeaturesContent from '@/ui/segments/help/features/content';
import FeaturesNavigation from '@/ui/segments/help/features/navigation';

export default function FeaturesSection({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <FeaturesNavigation searchParams={searchParams} />
      <FeaturesContent searchParams={searchParams} />
    </div>
  );
}
