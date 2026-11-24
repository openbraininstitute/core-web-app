import { LoadingOutlined } from '@ant-design/icons';

import { LAUNCH_GREEN, TASK_BUTTON_TEXT } from '@/features/scan-config/components/shared/box-class';
import { cn } from '@/utils/css-class';

type Props = {
  label: string;
  countLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function TaskLaunchButton({
  label,
  countLabel,
  pending = false,
  disabled = false,
  onClick,
  className,
}: Props) {
  return (
    <button
      data-testid="scan-config-launch"
      className={cn(
        'min-h-12.5 w-full cursor-pointer rounded-full p-2 text-white',
        TASK_BUTTON_TEXT,
        LAUNCH_GREEN,
        'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none',
        className
      )}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex justify-center gap-4">
        <span className="pl-10">
          {label} {countLabel ?? ''}
        </span>
        <div className="w-6">{pending && <LoadingOutlined />}</div>
      </div>
    </button>
  );
}
