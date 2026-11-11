'use client';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import EmptyCircleIcon from '@/components/icons/EmptyCircle';
import FullCircleIcon from '@/components/icons/FullCircle';
import PartialCircleIcon from '@/components/icons/PartialCircle';
import TriangleIcon from '@/components/icons/Triangle';
import { ActivityStatusColorMap } from '@/features/scan-config/constants';

import type { ReactNode } from 'react';

export const StatusMap: Record<
  string,
  { class: string; color: string; icon: ReactNode; title: string }
> = {
  started: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <EmptyCircleIcon className="mr-2" />,
    title: 'Started',
  },
  failure: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.ERROR],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Failure',
  },
  success: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Success',
  },
  initialized: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <EmptyCircleIcon className="mr-2 text-current" />,
    title: 'Initialized',
  },
  pending: {
    class: 'text-[#fa8c16]',
    color: ActivityStatusColorMap[ActivityStatus.PENDING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Pending',
  },
  processing: {
    class: 'text-[#fa8c16]',
    color: ActivityStatusColorMap[ActivityStatus.PENDING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Processing',
  },
  running: {
    class: 'text-[#389e0d]',
    color: ActivityStatusColorMap[ActivityStatus.RUNNING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Running',
  },
  error: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.ERROR],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Error',
  },
  cancelled: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.CANCELLED],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Cancelled',
  },
  done: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
  created: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Created',
  },
  default: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
};
