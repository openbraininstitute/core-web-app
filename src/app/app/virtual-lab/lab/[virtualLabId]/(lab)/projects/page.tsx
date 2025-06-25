'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

import { ServerSideComponentProp } from '@/types/common';

const VirtualLabProjectList = dynamic(
  () => import('@/components/VirtualLab/projects/VirtualLabProjectList'),
  {
    ssr: false,
  }
);

export default function VirtualLabProjectsPage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string }, null>) {
  const { virtualLabId } = use(promisedParams);

  return <VirtualLabProjectList id={virtualLabId} />;
}
