import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

export const simulationStatusColorMap = {
  [EntitycoreExecutionStatus.CREATED]: '#1890ff',
  [EntitycoreExecutionStatus.PENDING]: '#fa8c16',
  [EntitycoreExecutionStatus.RUNNING]: '#389e0d',
  [EntitycoreExecutionStatus.ERROR]: '#f5222d',
  [EntitycoreExecutionStatus.DONE]: '#002766',
};
