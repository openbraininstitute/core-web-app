import { ActivityExecutionStatus } from '@/api/entitycore/types/entities/execution';

export const simulationStatusColorMap = {
  [ActivityExecutionStatus.CREATED]: '#1890ff',
  [ActivityExecutionStatus.PENDING]: '#fa8c16',
  [ActivityExecutionStatus.RUNNING]: '#389e0d',
  [ActivityExecutionStatus.ERROR]: '#f5222d',
  [ActivityExecutionStatus.DONE]: '#002766',
};
