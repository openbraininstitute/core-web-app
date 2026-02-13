import { ActivityExecutionStatus } from '@/api/entitycore/types/entities/execution';
import CancelledIcon from '@/components/icons/activity-execution/cancelled';
import DoneIcon from '@/components/icons/activity-execution/done';
import ErrorIcon from '@/components/icons/activity-execution/error';
import GeneratedIcon from '@/components/icons/activity-execution/generated';
import PendingIcon from '@/components/icons/activity-execution/pending';
import RunningIcon from '@/components/icons/activity-execution/running';

import type { ReactNode } from 'react';

export const executionStatusIconMap: Record<ActivityExecutionStatus, ReactNode> = {
  [ActivityExecutionStatus.CREATED]: <GeneratedIcon />,
  [ActivityExecutionStatus.PENDING]: <PendingIcon />,
  [ActivityExecutionStatus.RUNNING]: <RunningIcon />,
  [ActivityExecutionStatus.DONE]: <DoneIcon />,
  [ActivityExecutionStatus.ERROR]: <ErrorIcon />,
  [ActivityExecutionStatus.CANCELLED]: <CancelledIcon />,
};
