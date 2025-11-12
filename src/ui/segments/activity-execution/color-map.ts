import { get } from 'es-toolkit/compat';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

export const ExecutionStatusColorMap = {
  [EntitycoreExecutionStatus.CREATED]: '#1890ff',
  [EntitycoreExecutionStatus.PENDING]: '#fa8c16',
  [EntitycoreExecutionStatus.RUNNING]: '#389e0d',
  [EntitycoreExecutionStatus.ERROR]: '#f5222d',
  [EntitycoreExecutionStatus.DONE]: '#002766',
};

export function getStatusColor(status: EntitycoreExecutionStatus): string {
  return get(ExecutionStatusColorMap, status, '#000000');
}
