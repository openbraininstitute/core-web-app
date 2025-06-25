import { Metadata } from 'next';

import CreateProjectFlow from '@/components/VirtualLab/create-entity-flows/project';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export const metadata: Metadata = {
  title: 'Project creation flow',
  description: 'Easily create and configure project with a user-friendly workflow.',
};

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId } = await promisedParams;
  return <CreateProjectFlow virtualLabId={virtualLabId} />;
}
