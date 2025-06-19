import { ReactNode } from 'react';

import ExploreListingLayout from '@/components/explore-section/ExploreListingLayout';

export default async function VirtualLabExperimentLayout({ children }: { children: ReactNode }) {
  return <ExploreListingLayout>{children}</ExploreListingLayout>;
}
