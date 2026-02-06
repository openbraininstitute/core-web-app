import type { ReactNode } from 'react';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

import CancelledIcon from '@/components/icons/activity-execution/cancelled';
import DoneIcon from '@/components/icons/activity-execution/done';
import ErrorIcon from '@/components/icons/activity-execution/error';
import GeneratedIcon from '@/components/icons/activity-execution/generated';
import PendingIcon from '@/components/icons/activity-execution/pending';
import RunningIcon from '@/components/icons/activity-execution/running';

export const executionStatusIconMap: Record<EntitycoreExecutionStatus, ReactNode> = {
  [EntitycoreExecutionStatus.CREATED]: <GeneratedIcon />,
  [EntitycoreExecutionStatus.PENDING]: <PendingIcon />,
  [EntitycoreExecutionStatus.RUNNING]: <RunningIcon />,
  [EntitycoreExecutionStatus.DONE]: <DoneIcon />,
  [EntitycoreExecutionStatus.ERROR]: <ErrorIcon />,
  [EntitycoreExecutionStatus.CANCELLED]: <CancelledIcon />,
};
