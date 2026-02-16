import { InfoCircleOutlined } from '@ant-design/icons';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';

export function StatusBadge({ status, details }: { status?: TActivityStatus; details?: string }) {
  const color = status ? executionStatusColorMap[status ?? ActivityStatus.CREATED] : '#004793';
  const showSpinner =
    status && [ActivityStatus.PENDING, ActivityStatus.RUNNING].includes(status as ActivityStatus);

  return (
    <div className="flex items-center">
      {showSpinner && (
        <svg
          className="mr-4 h-4 w-4 animate-spin"
          style={{ color }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <title>Loading</title>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span
        style={{ borderColor: color, color: `${color} !important` }}
        className="flex items-center rounded-xl border px-4 capitalize transition-colors duration-300"
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
