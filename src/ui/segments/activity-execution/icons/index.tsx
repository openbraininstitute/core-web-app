import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { ReactNode } from 'react';

import CancelledIcon from './cancelled';
import DoneIcon from './done';
import ErrorIcon from './error';
import GeneratedIcon from './generated';
import PendingIcon from './pending';
import RunningIcon from './running';

export const executionStatusIconMap: Record<EntitycoreExecutionStatus, ReactNode> = {
  [EntitycoreExecutionStatus.CREATED]: <GeneratedIcon />,
  [EntitycoreExecutionStatus.PENDING]: <PendingIcon />,
  [EntitycoreExecutionStatus.RUNNING]: <RunningIcon />,
  [EntitycoreExecutionStatus.DONE]: <DoneIcon />,
  [EntitycoreExecutionStatus.ERROR]: <ErrorIcon />,
  [EntitycoreExecutionStatus.CANCELLED]: <CancelledIcon />,
};
