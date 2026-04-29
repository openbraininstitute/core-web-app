import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';
import { cn } from '@/utils/css-class';

export function StatusBadge({ status, details }: { status?: TActivityStatus; details?: string }) {
  const color = status ? executionStatusColorMap[status ?? ActivityStatus.CREATED] : '#004793';
  const showSpinner =
    status && [ActivityStatus.PENDING, ActivityStatus.RUNNING].includes(status as ActivityStatus);

  return (
    <div className="flex items-center">
      {showSpinner && (
        <LoadingOutlined className="mr-2 text-base animate-spin  text-(--card-color)!" />
      )}
      <span
        style={{ borderColor: color, color: `${color} !important` }}
        className={cn(
          'flex items-center rounded-full border px-4 capitalize transition-colors duration-300 text-sm py-1',
          'bg-(--card-color) border-(--card-color)! text-white',
          'group-hover:bg-(--card-color)/70 group-hover:border-(--card-color)/70! group-hover:text-white '
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
              className="text-primary-9 z-50 max-w-80 rounded-md bg-white px-2 py-2 font-light shadow-md text-md"
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
