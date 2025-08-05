import { Suspense } from 'react';

import { EnhancedTreeSkeleton } from '@/features/brain-region-hierarchy/brain-region-skeleton';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';

import { ExploreLayout } from '@/ui/layouts/explore-layout';
import { ExploreHeader } from '@/ui/segments/explore-header';
import { resolveDataKey } from '@/utils/key-builder';
import { Card } from '@/ui/molecules/card';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { projectId } = await promisedParams;
  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  return (
    <ExploreLayout>
      <ExploreHeader />
      <div className="h-full max-h-[calc(100vh-10.7rem)] w-full px-3 [grid-area:aside]">
        <Card borderless className="h-full w-full py-0">
          <Suspense fallback={<EnhancedTreeSkeleton />}>
            <BrainRegionHierarchy dataKey={dataKey} />
          </Suspense>
        </Card>
      </div>
      <div className="w-full border border-blue-600 [grid-area:main]">
        <div className="mx-auto w-full p-8" />
      </div>
    </ExploreLayout>
  );
}
