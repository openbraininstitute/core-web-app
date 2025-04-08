'use client';;
import { use } from "react";

import VirtualLabTeamTable from '@/components/VirtualLab/VirtualLabTeamTable';
import withVirtualLabUsers from '@/components/VirtualLab/data/WithVirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabTeamPage(props: ServerSideComponentProp<{ virtualLabId: string }>) {
  const params = use(props.params);
  const { virtualLabId } = params;
  const WithVirtualLabUsers = withVirtualLabUsers(VirtualLabTeamTable, virtualLabId);
  return <WithVirtualLabUsers />;
}
