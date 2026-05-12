'use client';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';

export type GhostRoundedIconButtonClassNames = {
  /** Merged with the root `Button` `className`. */
  root?: string;
  label?: string;
  iconWrapper?: string;
};

export type GhostRoundedIconButtonProps = Omit<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'children'
> & {
  shadow?: string;
  icon?: ReactNode;
  label: ReactNode;
  /** Icon before (`start`) or after (`end`) the label. Default `end`. */
  iconPosition?: 'start' | 'end';
  size?: 'md' | 'lg';
  classNames?: GhostRoundedIconButtonClassNames;
};

export function GhostRoundedIconButton({
  className,
  classNames,
  icon,
  iconPosition = 'end',
  label,
  type = 'button',
  size = 'lg',
  shadow = 'shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)]',
  ...props
}: GhostRoundedIconButtonProps) {
  const labelEl = (
    <span className={cn('text-primary-9 text-base', classNames?.label)}>{label}</span>
  );

  const iconEl = (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center border',
        'rounded-full border-neutral-2 border-solid transition-colors',
        'hover:bg-gray-100 [&_svg]:text-current [&_svg]:size-3!',
        classNames?.iconWrapper
      )}
    >
      {icon}
    </div>
  );

  return (
    <Button
      rounded
      variant="ghost"
      size={size}
      type={type}
      className={cn(
        shadow,
        className,
        icon ? (iconPosition === 'start' ? 'pl-1' : 'pr-1') : '',
        classNames?.root
      )}
      {...props}
    >
      {iconPosition === 'start' ? (
        <>
          {icon && iconEl}
          {labelEl}
        </>
      ) : (
        <>
          {labelEl}
          {icon && iconEl}
        </>
      )}
    </Button>
  );
}

export type TabItem = {
  key: string;
  label: string;
};

export function PanelTabs({
  activeKey,
  items,
  onSelect,
}: {
  activeKey: string;
  items: Array<TabItem>;
  onSelect?: (key: string) => void;
}) {
  return (
    <nav
      aria-label="Workspace manager sections"
      className="flex min-w-0 items-center gap-3"
      data-testid="workspace-manager-section-tabs"
      id="workspace-manager-section-tabs"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const tabId = `workspace-manager-tab-${item.key}`;

        return (
          <Button
            rounded
            key={item.key}
            type="button"
            variant={isActive ? 'default' : 'ghost'}
            active={isActive}
            size="md"
            className={cn(
              'text-primary-9 h-10 min-w-28 px-7 text-lg font-normal transition-[background-color,box-shadow,color] duration-200',
              'focus-visible:ring-primary-6 focus-visible:ring-2',
              {
                'shadow-[0_18px_28px_-18px_rgba(0,39,102,0.7)] text-white! hover:bg-primary-8':
                  isActive,
              },
              { 'hover:bg-gray-200 hover:text-primary-9': !isActive }
            )}
            data-testid={tabId}
            id={tabId}
            onClick={() => onSelect?.(item.key)}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
