import type { ReactNode } from 'react';

import { ExploreLayout, ExploreInnerLayout } from '@/ui/layouts/explore-layout';
import { ExploreMenu } from '@/ui/segments/explore/left-menu';
import { ExploreHeader } from '@/ui/segments/explore/header';
import { resolveDataKey } from '@/utils/key-builder';
import { Card } from '@/ui/molecules/card';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  const { projectId } = await params;

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
        <div className="h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]">
          {children}
        </div>
      </ExploreInnerLayout>
    </ExploreLayout>
  );
}
