import SingleFeatureContent from '@/components/documentation/features/single-feature-content';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Available Features',
  description: 'Explore the available features in our documentation.',
};

export default function Page() {
  return <SingleFeatureContent />;
}
