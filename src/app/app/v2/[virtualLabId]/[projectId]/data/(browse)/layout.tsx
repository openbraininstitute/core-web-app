import type { ReactNode } from 'react';

import { DefaultContent as ExploreDefaultContent } from '@/ui/segments/explore/default-content';
import { DataInnerLayout } from '@/ui/layouts/explore-inner-layout';
import { DataHeader } from '@/ui/segments/explore/header';
import { DataLayout } from '@/ui/layouts/explore-layout';
import { resolveDataKey } from '@/utils/key-builder';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  const { projectId } = await params;

  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  return (
    <DataLayout>
      <DataHeader />
      <DataInnerLayout>
        <ExploreDefaultContent dataKey={dataKey}>{children}</ExploreDefaultContent>
      </DataInnerLayout>
    </DataLayout>
  );
}
