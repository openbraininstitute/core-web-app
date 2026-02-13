import { get } from 'es-toolkit/compat';

import {
  ActivityExecutionStatus,
  type TActivityExecutionStatus,
} from '@/api/entitycore/types/entities/execution';

export const executionStatusColorMap = {
  [ActivityExecutionStatus.CREATED]: '#004793',
  [ActivityExecutionStatus.PENDING]: '#a24fcc',
  [ActivityExecutionStatus.RUNNING]: '#1890ff',
  [ActivityExecutionStatus.ERROR]: '#e81f1f',
  [ActivityExecutionStatus.DONE]: '#389e0d',
  [ActivityExecutionStatus.CANCELLED]: '#a4a4a4',
};

export function getStatusColor(status: TActivityExecutionStatus): string {
  return get(executionStatusColorMap, status, '#000000');
}
