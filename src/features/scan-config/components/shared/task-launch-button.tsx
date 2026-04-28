import { LoadingOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';

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
      className={classNames(
        'min-h-[50] w-full cursor-pointer rounded-full p-2 text-white',
        'bg-[linear-gradient(94.93deg,#389E0D_18.84%,#143805_116.7%)]',
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
