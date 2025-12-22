'use client';

import { useParams } from 'next/navigation';

import SingleFeatureCard from '@/components/documentation/features/single-feature-card';
import {
  type ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import Slugify from '@/util/slugify';

export default function SingleFeatureContent() {
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

  const featureContent: ContentForFeatureItem[] = (() => {
    const filteredBySlug = content.filter(
      (item: ContentForFeatureItem) => Slugify(item.Scale) === slug
    );

    const filteredByStatus = filteredBySlug.filter(
      (item: ContentForFeatureItem) => item.Status === 'Available'
    );

    return filteredByStatus.length > 0 ? filteredByStatus : [];
  })();

  return (
    <div className="w-full px-8">
      <div className="mb-24 text-4xl font-bold text-white">{pageTitle}</div>
      <div className="mt-12 flex w-full flex-col gap-y-20">
        {featureContent.map((item: ContentForFeatureItem) => {
          return (
            <SingleFeatureCard key={item.Feature_title} content={item} imageNumber={imageNumber} />
          );
        })}
      </div>
    </div>
  );
}
