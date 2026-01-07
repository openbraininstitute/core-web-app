import {
  EntitycoreExecutionStatus,
  TEntitycoreExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { executionStatusIconMap } from '@/ui/segments/activity-execution//icons';
import { getStatusColor } from '@/ui/segments/activity-execution/color-map';
import { Fragment } from 'react';

const statusLabel = {
  [EntitycoreExecutionStatus.CREATED]: 'Generated',
  [EntitycoreExecutionStatus.PENDING]: 'Pending',
  [EntitycoreExecutionStatus.RUNNING]: 'Running',
  [EntitycoreExecutionStatus.DONE]: 'Done',
  [EntitycoreExecutionStatus.ERROR]: 'Error',
  [EntitycoreExecutionStatus.CANCELLED]: 'Cancelled',
};

type ExecutionStatusProps = {
  status: TEntitycoreExecutionStatus;
};

export function ExecutionStatus({ status }: ExecutionStatusProps) {
  const color = getStatusColor(status);

  return (
    <div
      className="flex w-32 items-center justify-center gap-2 rounded-full border px-1.5 py-0.5"
      style={{
        color,
        borderColor: color,
      }}
    >
      <span className="capitalize">{status}</span>
      <span className="text-xs">{executionStatusIconMap[status]}</span>
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
            {statuses.map((status) => (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5"
                style={{ color: getColor(status) }}
              >
                <span>{statusCountMap.get(status) ?? 0}</span>
                <span className="text-xs">{executionStatusIconMap[status]}</span>
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
            {statuses.map((status) => (
              <Fragment key={status}>
                <dt style={{ color: getColor(status) }}>
                  <span className="mr-2 inline-block text-xs">
                    {executionStatusIconMap[status]}
                  </span>
                  <span className="uppercase">{statusLabel[status]}:</span>
                </dt>

                <dd style={{ color: getColor(status) }}>
                  <span>{statusCountMap.get(status) ?? 0}</span>
                </dd>
              </Fragment>
            ))}
          </dl>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
