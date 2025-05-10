import { ReactNode } from 'react';

import ExploreListingLayout from '@/components/explore-section/ExploreListingLayout';

import type { WorkspaceContext } from '@/types/common';

export default async function VirtualLabExperimentLayout(props: {
  children: ReactNode;
  params: Promise<WorkspaceContext>;
}) {
  return <ExploreListingLayout>{props.children}</ExploreListingLayout>;
}
