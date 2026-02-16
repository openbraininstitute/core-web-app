import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

export const simulationStatusColorMap = {
  [ActivityStatus.CREATED]: '#1890ff',
  [ActivityStatus.PENDING]: '#fa8c16',
  [ActivityStatus.RUNNING]: '#389e0d',
  [ActivityStatus.ERROR]: '#f5222d',
  [ActivityStatus.DONE]: '#002766',
};
