import type { Metadata } from 'next';

import SingleFeatureContent from '@/components/documentation/features/single-feature-content';

export const metadata: Metadata = {
  title: 'Available Features',
  description: 'Explore the available features in our documentation.',
};

export default function Page() {
  return <SingleFeatureContent />;
}
