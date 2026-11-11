import SingleFeatureContent from '@/components/documentation/features/single-feature-content';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature',
  description: 'Explore our features to enhance your skills and knowledge.',
};

export default function Page() {
  return <SingleFeatureContent />;
}
