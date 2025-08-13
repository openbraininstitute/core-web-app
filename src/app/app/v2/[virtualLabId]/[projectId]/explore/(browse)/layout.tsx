import type { ReactNode } from 'react';

import { DefaultContent as ExploreDefaultContent } from '@/ui/segments/explore/default-content';
import { ExploreInnerLayout } from '@/ui/layouts/explore-inner-layout';
import { ExploreHeader } from '@/ui/segments/explore/header';
import { ExploreLayout } from '@/ui/layouts/explore-layout';
import { resolveDataKey } from '@/utils/key-builder';

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
        <ExploreDefaultContent dataKey={dataKey}>{children}</ExploreDefaultContent>
      </ExploreInnerLayout>
    </ExploreLayout>
  );
}
