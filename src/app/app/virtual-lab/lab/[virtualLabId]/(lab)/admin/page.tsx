'use client';

import { use } from 'react';

import VirtualLabSettingsComponent from '@/components/VirtualLab/VirtualLabSettingsComponent';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabAdminPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string }, null>) {
  const params = use(promisedParams);
  const { virtualLabId } = params;

  return <VirtualLabSettingsComponent id={virtualLabId} />;
}
