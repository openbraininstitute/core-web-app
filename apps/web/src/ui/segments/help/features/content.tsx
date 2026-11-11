'use client';

import { useSearchParams } from 'next/navigation';

import {
  type ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import FeaturesCard from '@/ui/segments/help/features/features-card';
import Slugify from '@/util/slugify';

export default function FeaturesContent() {
  const items = useSanityContentForFeatureItems() as ContentForFeatureItem[];
  const searchParams = useSearchParams();

  const activeScale = searchParams.get('scale') ?? 'subcellular'; // Default to 'subcellular'

  const filteredContent = items.filter((item) => Slugify(item.Scale) === activeScale);

  if (filteredContent.length === 0) {
    return <div className="col-span-3">No features found for scale</div>;
  }

  return (
    <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {filteredContent.map((item: ContentForFeatureItem) => (
        <FeaturesCard
          key={item.Feature_title ?? item.Topic ?? `feature-${Math.random()}`}
          item={item}
        />
      ))}
    </div>
  );
}
