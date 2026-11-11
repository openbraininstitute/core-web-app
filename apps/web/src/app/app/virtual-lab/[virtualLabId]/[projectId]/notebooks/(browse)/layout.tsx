import { BrainRegionUrlBoundary } from '@/features/brain-region-hierarchy/components/url-boundary';
import { BrainRegionUrlBoundaryMode } from '@/features/brain-region-hierarchy/constants';
import { NotebooksLayout } from '@/features/notebooks/components/notebooks-layout';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <BrainRegionUrlBoundary mode={BrainRegionUrlBoundaryMode.Strip}>
      <NotebooksLayout>{children}</NotebooksLayout>
    </BrainRegionUrlBoundary>
  );
}
