import { Fragment } from 'react';

import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { getStatusColor } from '@/features/task-runner/activity-execution/color-map';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

const StatusConfig = {
  [ActivityStatus.CREATED]: {
    label: 'Generated',
    icon: executionStatusIconMap[ActivityStatus.CREATED],
    value: ActivityStatus.CREATED,
  },
  [ActivityStatus.PENDING]: {
    label: 'Pending',
    icon: executionStatusIconMap[ActivityStatus.PENDING],
    value: ActivityStatus.PENDING,
  },
  [ActivityStatus.RUNNING]: {
    label: 'Running',
    icon: executionStatusIconMap[ActivityStatus.RUNNING],
    value: ActivityStatus.RUNNING,
  },
  [ActivityStatus.DONE]: {
    label: 'Done',
    icon: executionStatusIconMap[ActivityStatus.DONE],
    value: ActivityStatus.DONE,
  },
  [ActivityStatus.ERROR]: {
    label: 'Error',
    icon: executionStatusIconMap[ActivityStatus.ERROR],
    value: ActivityStatus.ERROR,
  },
  [ActivityStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: executionStatusIconMap[ActivityStatus.CANCELLED],
    value: ActivityStatus.CANCELLED,
  },
};

export function ActivityAggregatedStatusSkeleton() {
  return (
    <div className="flex">
      <div className="divide-neutral-2 border-neutral-2 flex divide-x rounded-full px-0.5 border">
        <div className="flex items-center gap-1 px-0.5 py-0.5">
          <span className="h-4.5 w-6 animate-pulse rounded-full bg-neutral-200" />
          <span className="h-4.5 w-4.5 animate-pulse rounded-full bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

type Props = {
  status: TActivityStatus;
};

export function ActivityStatusRenderer({ status }: Props) {
  const color = getStatusColor(status);
  const statusConfig = StatusConfig[status];

  return (
    <div
      id={`execution-status-${status}`}
      className="flex min-w-max w-full max-w-20  items-center justify-between gap-2 rounded-full border px-4 py-0.5"
      style={{
        color,
        borderColor: color,
        backgroundColor: `${color}1A`,
      }}
    >
      <span className="capitalize font-bold select-none">{statusConfig.label}</span>
      <span className="text-xs">{statusConfig.icon}</span>
    </div>
  );
}

type ExecutionSetAggregatedStatusProps = {
  statusCountMap: Map<ActivityStatus, number>;
};

export default function ActivityAggregatedStatus({
  statusCountMap,
}: ExecutionSetAggregatedStatusProps) {
  const getColor = (status: ActivityStatus) =>
    statusCountMap.get(status) ? getStatusColor(status) : '#bfbfbf';
  const hasExecutions = (status: ActivityStatus) => !!statusCountMap.get(status);

  const statuses = Object.values(ActivityStatus).filter(hasExecutions);

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
          side="bottom"
          align="end"
          sideOffset={0}
          collisionPadding={{ bottom: 20 }}
          className="rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
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

                  <dd
                    className="text-primary-8 font-bold"
                    style={{ color: getColor(statusConfig.value) }}
                  >
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

export { ActivityAggregatedStatus };
