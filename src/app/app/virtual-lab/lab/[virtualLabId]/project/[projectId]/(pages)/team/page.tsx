'use client';

import ProjectTeamTable from '@/components/VirtualLab/ProjectTeamTable';
import withVirtualLabUsers from '@/components/VirtualLab/data/WithVirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabProjectTeamPage({
  params,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>) {
  const { virtualLabId, projectId } = params;
  const WithVirtualLabProjectUsers = withVirtualLabUsers(ProjectTeamTable, virtualLabId, projectId);
  return <WithVirtualLabProjectUsers />;
}
