import { getGuidesContent, GuideCardProps } from '@/api/sanity/help-guides-section/route';
import GuideCard from '@/ui/segments/help/guides/card';
import { getSearchParam } from '@/utils/getSearchParams';

export const dynamic = 'force-dynamic';

export default async function GuidesContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const content = (await getGuidesContent()) as GuideCardProps[];

  const guidesParams = getSearchParam(searchParams, 'subsection');

  // Filter guides based on subsection (topic)
  const filteredContent = guidesParams
    ? content.filter((guide) => guide.topic?.toLowerCase() === guidesParams.toLowerCase())
    : content;

  return (
    <div className="text-primary-9 col-span-3 flex max-h-[82vh] w-2/3 flex-col items-start gap-y-4 overflow-y-scroll">
      {filteredContent.map((guide) => (
        <GuideCard key={guide.slug?.current || guide.title || 'guide'} content={guide} />
      ))}
    </div>
  );
}
