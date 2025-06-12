'use client';

import { useParams } from 'next/navigation';

import SingleFeatureCard from '@/components/documentation/features/single-feature-card';
import {
  ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import Slugify from '@/util/slugify';

export default function SingleFeaturePage() {
  const content = useSanityContentForFeatureItems();

  const params = useParams();
  const slug = params.slug as string;

  let pageTitle;
  let imageNumber = 1;

  switch (slug) {
    case 'subcellular':
      pageTitle = 'Subcellular Features';
      imageNumber = 1;
      break;
    case 'cellular':
      pageTitle = 'Cellular Features';
      imageNumber = 2;
      break;
    case 'circuit':
      pageTitle = 'Circuit Features';
      imageNumber = 3;
      break;
    case 'system':
      pageTitle = 'System Features';
      imageNumber = 1;
      break;
    default:
      pageTitle = 'All Features';
      imageNumber = 1;
      break;
  }

  const featureContent: ContentForFeatureItem[] = content
    ? content.filter((item: ContentForFeatureItem) => Slugify(item.Scale) === slug)
    : [];

  if (!featureContent) {
    return (
      <div className="container mx-auto p-4 text-white">
        <h1 className="text-3xl font-bold">Feature Not Found</h1>
        <p>The feature could not be found or is still loading.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-8">
      <div className="mb-12 text-4xl font-bold text-white">{pageTitle}</div>
      <div className="flex w-full flex-col gap-x-5">
        {featureContent.map((item: ContentForFeatureItem) => {
          return (
            <SingleFeatureCard key={item.Feature_title} content={item} imageNumber={imageNumber} />
          );
        })}
      </div>
    </div>
  );
}
