import ExploreInteractive from '@/page-wrappers/explore/interactive';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function InteractivePage(
  props: ServerSideComponentProp<WorkspaceContext, { brainRegion: string }>
) {
  const params = await props.params;

  return (
    <ExploreInteractive
      {...{
        virtualLabId: params.virtualLabId,
        projectId: params.projectId,
      }}
    />
  );
}
