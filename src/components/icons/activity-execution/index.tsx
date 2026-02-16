import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import CancelledIcon from '@/components/icons/activity-execution/cancelled';
import DoneIcon from '@/components/icons/activity-execution/done';
import ErrorIcon from '@/components/icons/activity-execution/error';
import GeneratedIcon from '@/components/icons/activity-execution/generated';
import PendingIcon from '@/components/icons/activity-execution/pending';
import RunningIcon from '@/components/icons/activity-execution/running';

import type { ReactNode } from 'react';

export const executionStatusIconMap: Record<ActivityStatus, ReactNode> = {
  [ActivityStatus.CREATED]: <GeneratedIcon />,
  [ActivityStatus.PENDING]: <PendingIcon />,
  [ActivityStatus.RUNNING]: <RunningIcon />,
  [ActivityStatus.DONE]: <DoneIcon />,
  [ActivityStatus.ERROR]: <ErrorIcon />,
  [ActivityStatus.CANCELLED]: <CancelledIcon />,
};
