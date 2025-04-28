'use client';

import { use } from 'react';

import ExploreInteractive from '@/page-wrappers/explore/interactive';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function InteractivePage(
  props: ServerSideComponentProp<WorkspaceContext, { brainRegion: string }>
) {
  const params = use(props.params);

  return (
    <ExploreInteractive
      {...{
        virtualLabId: params.virtualLabId,
        projectId: params.projectId,
      }}
    />
  );
}
