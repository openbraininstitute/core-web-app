import { Fragment } from 'react';

import {
  EntitycoreExecutionStatus,
  TEntitycoreExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { getStatusColor } from '@/ui/segments/activity-execution/color-map';

const StatusConfig = {
  [EntitycoreExecutionStatus.CREATED]: {
    label: 'Generated',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.CREATED],
    value: EntitycoreExecutionStatus.CREATED,
  },
  [EntitycoreExecutionStatus.PENDING]: {
    label: 'Pending',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.PENDING],
    value: EntitycoreExecutionStatus.PENDING,
  },
  [EntitycoreExecutionStatus.RUNNING]: {
    label: 'Running',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.RUNNING],
    value: EntitycoreExecutionStatus.RUNNING
  },
  [EntitycoreExecutionStatus.DONE]: {
    label: 'Done',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.DONE],
    value: EntitycoreExecutionStatus.DONE
  },
  [EntitycoreExecutionStatus.ERROR]: {
    label: 'Error',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.ERROR],
    value: EntitycoreExecutionStatus.ERROR
  },
  [EntitycoreExecutionStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: executionStatusIconMap[EntitycoreExecutionStatus.CANCELLED],
    value: EntitycoreExecutionStatus.CANCELLED
  },
};

type ExecutionStatusProps = {
  status: TEntitycoreExecutionStatus;
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
  statusCountMap: Map<EntitycoreExecutionStatus, number>;
};

export default function ExecutionAggregatedStatus({
  statusCountMap,
}: ExecutionSetAggregatedStatusProps) {
  const getColor = (status: EntitycoreExecutionStatus) =>
    statusCountMap.get(status) ? getStatusColor(status) : '#bfbfbf';
  const hasExecutions = (status: EntitycoreExecutionStatus) => !!statusCountMap.get(status);

  const statuses = Object.values(EntitycoreExecutionStatus).filter(hasExecutions);

  return (
    <div className="flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="divide-neutral-2 border-neutral-2 flex divide-x rounded-full border px-1.5">
            {statuses.map(status => StatusConfig[status]).map((statusConfig) => (
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
            {statuses.map(status => StatusConfig[status]).map((statusConfig) => (
              <Fragment key={statusConfig.value}>
                <dt style={{ color: getColor(statusConfig.value) }}>
                  <span className="mr-2 inline-block text-xs">
                    {statusConfig.icon}
                  </span>
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
