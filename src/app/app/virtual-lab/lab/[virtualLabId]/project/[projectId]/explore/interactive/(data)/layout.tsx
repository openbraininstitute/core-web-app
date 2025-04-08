'use client';

import { ReactNode, use } from 'react';
import ExploreListingLayout from '@/components/explore-section/ExploreListingLayout';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

export default function VirtualLabExperimentLayout(
  props: {
    children: ReactNode;
    params: Promise<{ virtualLabId: string; projectId: string }>;
  }
) {
  const params = use(props.params);

  const {
    children
  } = props;

  const virtualLabInfo: VirtualLabInfo = {
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  };
  return <ExploreListingLayout virtualLabInfo={virtualLabInfo}>{children}</ExploreListingLayout>;
}
