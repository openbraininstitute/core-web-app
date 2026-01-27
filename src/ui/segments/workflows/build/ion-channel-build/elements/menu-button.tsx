import { CheckCircleFilled, RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Button } from '@/ui/molecules/button';
import { RenderErrorTooltip } from '@/ui/segments/workflows/build/ion-channel-build/elements/error-tooltip';
import { cn } from '@/utils/css-class';

export function MenuButton({
  propName,
  isActive,
  onClick,
  showErrorIcon,
  showValidIcon,
  label,
}: {
  propName: string;
  isActive: boolean;
  onClick: (propName: string) => void;
  showErrorIcon: boolean;
  showValidIcon: boolean;
  label: ReactNode;
}) {
  return (
    <Button
      rounded
      key={propName}
      variant={isActive ? 'shadow' : 'outline'}
      onClick={() => onClick(propName)}
      className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
    >
      <span
        className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
          'font-bold text-white': isActive,
        })}
      >
        {label}
      </span>
      {/* eslint-disable-next-line no-nested-ternary */}
      {showErrorIcon ? (
        <RenderErrorTooltip isActive={isActive} />
      ) : showValidIcon ? (
        <CheckCircleFilled className="text-accent-dark text-lg" />
      ) : null}
      <RightOutlined
        className={cn('text-primary-9 [&>svg]:size-2.5!', {
          'rotate-90 text-white': isActive,
        })}
      />
    </Button>
  );
}
