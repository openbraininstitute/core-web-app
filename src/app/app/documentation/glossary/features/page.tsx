import { Metadata } from 'next';

import AllFeaturesContent from '@/components/documentation/features/all-features-content';

export const metadata: Metadata = {
  title: 'Available Features',
  description: 'Explore the available features in our documentation.',
};

export default function Page() {
  return <AllFeaturesContent />;
}
