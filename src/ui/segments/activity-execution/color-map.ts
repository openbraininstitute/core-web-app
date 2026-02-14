import { get } from 'es-toolkit/compat';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';

export const executionStatusColorMap = {
  [ActivityStatus.CREATED]: '#004793',
  [ActivityStatus.PENDING]: '#a24fcc',
  [ActivityStatus.RUNNING]: '#1890ff',
  [ActivityStatus.ERROR]: '#e81f1f',
  [ActivityStatus.DONE]: '#389e0d',
  [ActivityStatus.CANCELLED]: '#a4a4a4',
};

export function getStatusColor(status: TActivityStatus): string {
  return get(executionStatusColorMap, status, '#000000');
}
