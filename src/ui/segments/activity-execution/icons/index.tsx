import { ReactNode } from 'react';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

import CancelledIcon from '@/ui/segments/activity-execution/icons/cancelled';
import DoneIcon from '@/ui/segments/activity-execution/icons/done';
import ErrorIcon from '@/ui/segments/activity-execution/icons/error';
import GeneratedIcon from '@/ui/segments/activity-execution/icons/generated';
import PendingIcon from '@/ui/segments/activity-execution/icons/pending';
import RunningIcon from '@/ui/segments/activity-execution/icons/running';

export const executionStatusIconMap: Record<EntitycoreExecutionStatus, ReactNode> = {
  [EntitycoreExecutionStatus.CREATED]: <GeneratedIcon />,
  [EntitycoreExecutionStatus.PENDING]: <PendingIcon />,
  [EntitycoreExecutionStatus.RUNNING]: <RunningIcon />,
  [EntitycoreExecutionStatus.DONE]: <DoneIcon />,
  [EntitycoreExecutionStatus.ERROR]: <ErrorIcon />,
  [EntitycoreExecutionStatus.CANCELLED]: <CancelledIcon />,
};
