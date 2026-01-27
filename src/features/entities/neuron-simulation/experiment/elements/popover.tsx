import { Popover, type PopoverProps } from 'antd';
import type React from 'react';

import { classNames } from '@/util/utils';

type Props = {
  message?: React.ReactNode;
  children: React.ReactNode;
  content?: React.ReactNode;
  when?: PopoverProps['trigger'];
  placement?: PopoverProps['placement'];
  onConfirm?: () => void;
  visible?: boolean;
  onOpenChange?: (open: boolean) => void;
  cls?: { contentContainer?: string };
};

export function CustomPopover({
  onConfirm,
  message,
  content,
  children,
  when = ['click'],
  placement = 'topRight',
  visible,
  onOpenChange,
  cls,
}: Props) {
  return (
    <Popover
      destroyTooltipOnHide
      open={visible}
      placement={placement}
      getPopupContainer={(trigger) => trigger.parentElement!}
      getTooltipContainer={(trigger) => trigger.parentElement!}
      trigger={when}
      onOpenChange={onOpenChange}
      overlayClassName={classNames(
        '[&_.ant-popover-inner]:p-0! [&_.ant-popover-inner]:bg-primary-8! max-w-[260px]',
        '[&_.ant-popover-arrow:before]:bg-primary-8'
      )}
      content={
        <div
          className={classNames(
            'bg-primary-8 flex flex-col items-center justify-center gap-4 p-8',
            cls?.contentContainer
          )}
        >
          {message && <p className="text-center text-base font-light text-white">{message}</p>}
          {content}
          {onConfirm && (
            <button
              type="button"
              className="bg-primary-8 border border-white px-7 py-3 font-bold text-white"
              onClick={onConfirm}
            >
              Confirm
            </button>
          )}
        </div>
      }
    >
      {children}
    </Popover>
  );
}

export default CustomPopover;
