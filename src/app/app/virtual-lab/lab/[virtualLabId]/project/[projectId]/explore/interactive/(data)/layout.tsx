import { ReactNode } from 'react';

import ExploreListingLayout from '@/components/explore-section/ExploreListingLayout';

import type { WorkspaceContext } from '@/types/common';

export default async function VirtualLabExperimentLayout({
  children,
}: {
  children: ReactNode;
  // eslint-disable-next-line react/no-unused-prop-types
  params: Promise<WorkspaceContext>;
}) {
  return <ExploreListingLayout>{children}</ExploreListingLayout>;
}
