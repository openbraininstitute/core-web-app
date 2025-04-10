'use client';;
import { use } from "react";

import ProjectTeamTable from '@/components/VirtualLab/ProjectTeamTable';
import withVirtualLabUsers from '@/components/VirtualLab/data/WithVirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabProjectTeamPage(
  props: ServerSideComponentProp<{ virtualLabId: string; projectId: string }>
) {
  const params = use(props.params);
  const { virtualLabId, projectId } = params;
  const WithVirtualLabProjectUsers = withVirtualLabUsers(ProjectTeamTable, virtualLabId, projectId);
  return <WithVirtualLabProjectUsers />;
}
