import type { Metadata } from 'next';

import ExploreInteractive from '@/page-wrappers/explore/interactive';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export const metadata: Metadata = {
  title: 'Explore interactive',
  description: 'Explore data interactively',
};

export default async function InteractivePage(
  _: ServerSideComponentProp<WorkspaceContext, { brainRegion: string }>
) {
  return <ExploreInteractive />;
}
