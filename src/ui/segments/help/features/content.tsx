'use client';

import FeaturesCard from '@/ui/segments/help/features/features-card';

import {
  useSanityContentForFeatureItems,
  type ContentForFeatureItem,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import Slugify from '@/util/slugify';
import { getSearchParam, PageProps } from '@/utils/getSearchParams';

export default function FeaturesContent({ searchParams }: PageProps) {
  const sectionParams = getSearchParam(searchParams ?? {}, 'scale');

  const items = useSanityContentForFeatureItems() as ContentForFeatureItem[];

  if (!Array.isArray(items) || items.length === 0) {
    return <div className="col-span-3">No features available.</div>;
  }

  if (!sectionParams) {
    return (
      <div className="col-span-3 text-neutral-600">
        Pick a scale on the left to view features for that scale.
      </div>
    );
  }

  const matches = items
    .filter((it) => Slugify(it.Scale) === sectionParams)
    .sort((a, b) => {
      const an = (a.Feature_title ?? '').toLowerCase();
      const bn = (b.Feature_title ?? '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

  if (matches.length === 0) {
    return (
      <div className="col-span-3">
        No features found for scale <span className="font-medium">“{sectionParams}”</span>.
      </div>
    );
  }

  return (
    <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {matches.map((item: ContentForFeatureItem) => (
        <FeaturesCard
          key={item.Feature_title ?? item.Topic ?? `feature-${Math.random()}`}
          item={item}
        />
      ))}
    </div>
  );
}
