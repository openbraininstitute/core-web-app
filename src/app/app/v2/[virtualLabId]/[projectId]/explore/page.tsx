import { ExploreLayout, ExploreInnerLayout } from '@/ui/layouts/explore-layout';

import { ExploreMenu } from '@/ui/segments/explore/left-menu';
import { ExploreHeader } from '@/ui/segments/explore/header';

import { resolveDataKey } from '@/utils/key-builder';
import { Atlas } from '@/ui/segments/explore/atlas';
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
      <ExploreInnerLayout>
        <div
          id="explore-left-menu"
          data-testid="explore-left-menu"
          className="h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full overflow-hidden [grid-area:aside]"
        >
          <Card borderless className="h-full w-full gap-0 bg-white py-0 shadow-lg">
            <ExploreMenu dataKey={dataKey} />
          </Card>
        </div>
        <div className="h-full max-h-[calc(100vh-11.8rem)] w-full rounded-2xl [grid-area:body]">
          <Atlas dataKey={dataKey} />
        </div>
      </ExploreInnerLayout>
    </ExploreLayout>
  );
}
