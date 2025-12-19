import type { Metadata } from 'next';

import AllFeaturesContent from '@/components/documentation/features/all-features-content';

export const metadata: Metadata = {
  title: 'All Features',
  description: 'Explore all available features in our documentation.',
};

export default function Page() {
  return <AllFeaturesContent />;
}
