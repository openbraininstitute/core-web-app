'use client';

import GuideCard from '@/ui/segments/help/guides/card';

import type { GuideCardProps } from '@/services/sanity';
import type { GuidesContentsProps } from '@/services/sanity/api/get-guides-content';

export function GuidesView({ guides }: { guides: GuidesContentsProps }) {
  if (!guides?.length) {
    return <p className="text-primary-9/70">No guides available.</p>;
  }

  return (
    <div className="text-primary-9 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-auto pr-2">
      {guides.map((guide, index) => (
        <GuideCard
          key={guide.slug?.current ?? guide.title ?? `guide-${index}`}
          content={guide as GuideCardProps}
        />
      ))}
    </div>
  );
}

export default GuidesView;
