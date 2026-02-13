import { Fragment } from 'react';

import {
  ActivityExecutionStatus,
  type TActivityExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getStatusColor } from '@/ui/segments/activity-execution/color-map';

const StatusConfig = {
  [ActivityExecutionStatus.CREATED]: {
    label: 'Generated',
    icon: executionStatusIconMap[ActivityExecutionStatus.CREATED],
    value: ActivityExecutionStatus.CREATED,
  },
  [ActivityExecutionStatus.PENDING]: {
    label: 'Pending',
    icon: executionStatusIconMap[ActivityExecutionStatus.PENDING],
    value: ActivityExecutionStatus.PENDING,
  },
  [ActivityExecutionStatus.RUNNING]: {
    label: 'Running',
    icon: executionStatusIconMap[ActivityExecutionStatus.RUNNING],
    value: ActivityExecutionStatus.RUNNING,
  },
  [ActivityExecutionStatus.DONE]: {
    label: 'Done',
    icon: executionStatusIconMap[ActivityExecutionStatus.DONE],
    value: ActivityExecutionStatus.DONE,
  },
  [ActivityExecutionStatus.ERROR]: {
    label: 'Error',
    icon: executionStatusIconMap[ActivityExecutionStatus.ERROR],
    value: ActivityExecutionStatus.ERROR,
  },
  [ActivityExecutionStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: executionStatusIconMap[ActivityExecutionStatus.CANCELLED],
    value: ActivityExecutionStatus.CANCELLED,
  },
};

type ExecutionStatusProps = {
  status: TActivityExecutionStatus;
};

export function ExecutionStatus({ status }: ExecutionStatusProps) {
  const color = getStatusColor(status);

  const statusConfig = StatusConfig[status];

  return (
    <div
      className="flex w-32 items-center justify-center gap-2 rounded-full border px-1.5 py-0.5"
      style={{
        color,
        borderColor: color,
      }}
    >
      <span className="capitalize">{statusConfig.label}</span>
      <span className="text-xs">{statusConfig.icon}</span>
    </div>
  );
}

type ExecutionSetAggregatedStatusProps = {
  statusCountMap: Map<ActivityExecutionStatus, number>;
};

export default function ExecutionAggregatedStatus({
  statusCountMap,
}: ExecutionSetAggregatedStatusProps) {
  const getColor = (status: ActivityExecutionStatus) =>
    statusCountMap.get(status) ? getStatusColor(status) : '#bfbfbf';
  const hasExecutions = (status: ActivityExecutionStatus) => !!statusCountMap.get(status);

  const statuses = Object.values(ActivityExecutionStatus).filter(hasExecutions);

  return (
    <div className="flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="divide-neutral-2 border-neutral-2 flex divide-x rounded-full border px-1.5">
            {statuses
              .map((status) => StatusConfig[status])
              .map((statusConfig) => (
                <div
                  key={statusConfig.value}
                  className="flex items-center gap-1 px-1.5 py-0.5"
                  style={{ color: getColor(statusConfig.value) }}
                >
                  <span>{statusCountMap.get(statusConfig.value) ?? 0}</span>
                  <span className="text-xs">{statusConfig.icon}</span>
                </div>
              ))}
          </div>
        </TooltipTrigger>

        <TooltipContent
          avoidCollisions
          side="left"
          sideOffset={5}
          collisionPadding={{ bottom: 20 }}
          className="text-primary-8 max-w-2xs bg-white text-base shadow-lg"
          arrowClassName="bg-white"
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-2">
            {statuses
              .map((status) => StatusConfig[status])
              .map((statusConfig) => (
                <Fragment key={statusConfig.value}>
                  <dt style={{ color: getColor(statusConfig.value) }}>
                    <span className="mr-2 inline-block text-xs">{statusConfig.icon}</span>
                    <span className="uppercase">{statusConfig.label}:</span>
                  </dt>

                  <dd style={{ color: getColor(statusConfig.value) }}>
                    <span>{statusCountMap.get(statusConfig.value) ?? 0}</span>
                  </dd>
                </Fragment>
              ))}
          </dl>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export { ExecutionAggregatedStatus };
