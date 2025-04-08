'use client';;
import { use } from "react";

import VirtualLabProjectList from '@/components/VirtualLab/projects/VirtualLabProjectList';
import { ServerSideComponentProp } from '@/types/common';

export default function VirtualLabProjectsPage(props: ServerSideComponentProp<{ virtualLabId: string }>) {
  const params = use(props.params);
  const { virtualLabId } = params;

  return <VirtualLabProjectList id={virtualLabId} />;
}
