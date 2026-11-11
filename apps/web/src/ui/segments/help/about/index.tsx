import AboutContent from '@/ui/segments/help/about/content';
import AboutNavigation from '@/ui/segments/help/about/navigation';

export default function AboutSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <AboutNavigation />
      <AboutContent searchParams={searchParams} />
    </div>
  );
}
