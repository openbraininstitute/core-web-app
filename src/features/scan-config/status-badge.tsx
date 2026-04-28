import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export function StatusBadge({ status, details }: { status?: TActivityStatus; details?: string }) {
  const color = status ? executionStatusColorMap[status ?? ActivityStatus.CREATED] : '#004793';
  const showSpinner =
    status && [ActivityStatus.PENDING, ActivityStatus.RUNNING].includes(status as ActivityStatus);

  return (
    <div className="flex items-center">
      {showSpinner && (
        <LoadingOutlined className="mr-2 text-base animate-spin text-(--card-color)!" />
      )}
      <span
        style={{ borderColor: color, color: `${color} !important` }}
        className={cn(
          'flex items-center rounded-full border px-4 py-1 text-sm capitalize transition-colors duration-300',
          'bg-(--card-color) border-(--card-color)! text-white',
          'group-hover:bg-(--card-color)/70 group-hover:border-(--card-color)/70! group-hover:text-white'
        )}
      >
        {status ?? 'created'}
        {details && (
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoCircleOutlined className="ml-2 cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="text-primary-9 z-50 max-w-80 rounded-md bg-white px-2 py-2 text-md font-light shadow-md"
              arrowClassName="bg-white"
            >
              <p>{details}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </div>
  );
}

export function StatusBadgeSkeleton() {
  return (
    <div className="flex items-center">
      <span className="flex items-center rounded-xl border border-neutral-200 px-4 capitalize">
        <span className="my-1 h-4 w-12 animate-pulse rounded bg-neutral-200" />
      </span>
    </div>
  );
}
