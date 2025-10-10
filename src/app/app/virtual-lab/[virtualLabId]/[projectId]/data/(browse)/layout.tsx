'use client';

import { use } from 'react';

import type { ReactNode } from 'react';

import { DefaultContent as ExploreDefaultContent } from '@/ui/segments/explore/default-content';
import { dataTour, useNextStepOnboarding } from '@/ui/segments/app-setup/discover-app';
import { DataInnerLayout } from '@/ui/layouts/explore-inner-layout';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import { DataHeader } from '@/ui/segments/explore/header';
import { DataLayout } from '@/ui/layouts/explore-layout';
import { resolveDataKey } from '@/utils/key-builder';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function Page({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
}) {
  const { projectId } = use(params);
  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  useNextStepOnboarding({ condition: true, tour: dataTour });

  return (
    <DataLayout>
      <DataHeader />
      <DataInnerLayout>
        <ExploreDefaultContent dataKey={dataKey}>{children}</ExploreDefaultContent>
        <ContributionModal />
      </DataInnerLayout>
    </DataLayout>
  );
}
