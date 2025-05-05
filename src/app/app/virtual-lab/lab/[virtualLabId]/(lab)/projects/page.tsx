'use client';

import dynamic from 'next/dynamic';

import { ServerSideComponentProp } from '@/types/common';

const VirtualLabProjectList = dynamic(
  () => import('@/components/VirtualLab/projects/VirtualLabProjectList'),
  {
    ssr: false,
  }
);

export default function VirtualLabProjectsPage({
  params,
}: ServerSideComponentProp<{ virtualLabId: string }>) {
  const { virtualLabId } = params;

  return <VirtualLabProjectList id={virtualLabId} />
}
