'use client';

import { use } from 'react';

import VirtualLabTeamTable from '@/components/VirtualLab/VirtualLabTeamTable';
import withVirtualLabUsers from '@/components/VirtualLab/data/WithVirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabTeamPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string }, null>) {
  const { virtualLabId } = use(promisedParams);
  const WithVirtualLabUsers = withVirtualLabUsers(VirtualLabTeamTable, virtualLabId);
  return <WithVirtualLabUsers />;
}
