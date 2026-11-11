'use client';

import SingleFeatureCard from '@/components/documentation/features/single-feature-card';
import {
  type ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';

export default function AllFeaturesContent() {
  const content = useSanityContentForFeatureItems();

  const availableFeatures = content.filter(
    (item: ContentForFeatureItem) => item.Status === 'Available'
  );

  return (
    <div className="w-full px-8">
      <div className="mb-24 flex flex-row items-baseline gap-x-3 text-white">
        <div className="text-4xl font-bold">All available features</div>
        <div className="text-lg font-normal">{availableFeatures.length}</div>
      </div>
      <div className="mt-12 flex w-full flex-col gap-y-20">
        {availableFeatures.map((item: ContentForFeatureItem) => {
          return <SingleFeatureCard key={item.Feature_title} content={item} imageNumber={1} />;
        })}
      </div>
    </div>
  );
}
