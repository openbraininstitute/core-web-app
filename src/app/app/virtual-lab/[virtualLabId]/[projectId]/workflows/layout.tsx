import { BrainRegionUrlBoundary } from '@/features/brain-region-hierarchy/components/url-boundary';
import { BrainRegionUrlBoundaryMode } from '@/features/brain-region-hierarchy/constants';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function WorkflowsLayout({ children }: Props) {
  return (
    <BrainRegionUrlBoundary mode={BrainRegionUrlBoundaryMode.Strip}>
      {children}
    </BrainRegionUrlBoundary>
  );
}
