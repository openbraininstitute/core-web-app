import { get } from 'es-toolkit/compat';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

export const executionStatusColorMap = {
  [EntitycoreExecutionStatus.CREATED]: '#004793',
  [EntitycoreExecutionStatus.PENDING]: '#a24fcc',
  [EntitycoreExecutionStatus.RUNNING]: '#1890ff',
  [EntitycoreExecutionStatus.ERROR]: '#e81f1f',
  [EntitycoreExecutionStatus.DONE]: '#389e0d',
  [EntitycoreExecutionStatus.CANCELLED]: '#a4a4a4',
};

export function getStatusColor(status: EntitycoreExecutionStatus): string {
  return get(executionStatusColorMap, status, '#000000');
}
