'use client';

import { use } from 'react';

import ProjectTeamTable from '@/components/VirtualLab/ProjectTeamTable';
import withVirtualLabUsers from '@/components/VirtualLab/data/WithVirtualLabUsers';
import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function VirtualLabProjectTeamPage({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, any>) {
  const params = use(promisedParams);
  const { virtualLabId, projectId } = params;
  const WithVirtualLabProjectUsers = withVirtualLabUsers(ProjectTeamTable, virtualLabId, projectId);
  return <WithVirtualLabProjectUsers />;
}
