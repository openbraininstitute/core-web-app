import AllFeaturesContent from '@/components/documentation/features/all-features-content';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Available Features',
  description: 'Explore the available features in our documentation.',
};

export default function Page() {
  return <AllFeaturesContent />;
}
