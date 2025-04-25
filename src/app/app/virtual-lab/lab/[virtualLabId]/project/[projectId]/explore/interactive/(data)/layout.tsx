'use client';

import { ReactNode, use } from 'react';
import ExploreListingLayout from '@/components/explore-section/ExploreListingLayout';
import { WorkspaceContext } from '@/types/common';

export default function VirtualLabExperimentLayout(props: {
  children: ReactNode;
  params: Promise<WorkspaceContext>;
}) {
  const params = use(props.params);

  const { children } = props;

  const virtualLabInfo: WorkspaceContext = {
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  };

  return <ExploreListingLayout virtualLabInfo={virtualLabInfo}>{children}</ExploreListingLayout>;
}
