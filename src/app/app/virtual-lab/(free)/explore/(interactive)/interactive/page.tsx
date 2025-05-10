import ExploreInteractive from '@/page-wrappers/explore/interactive';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function InteractivePage(
  _: ServerSideComponentProp<WorkspaceContext, { brainRegion: string }>
) {
  return <ExploreInteractive />;
}
