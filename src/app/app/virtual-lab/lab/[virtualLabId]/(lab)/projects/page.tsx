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

export default function VirtualLabProjectsPage(
  props: ServerSideComponentProp<{ virtualLabId: string }, null>
) {
  const { virtualLabId } = use(props.params);

  return <VirtualLabProjectList id={virtualLabId} />;
}
