import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';

export function SimulationStatusBadge({ status }: { status?: EntitycoreExecutionStatus }) {
  const color = status ? executionStatusColorMap[status] : '#fafafa';
  const showSpinner = status && ['pending', 'running'].includes(status);

  // TODO: move spinner outside of the module.

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
        style={{ borderColor: color, color }}
        className="flex items-center rounded-xl border-1 px-4 capitalize transition-colors duration-300"
      >
        {status ?? ''}
      </span>
    </div>
  );
}
