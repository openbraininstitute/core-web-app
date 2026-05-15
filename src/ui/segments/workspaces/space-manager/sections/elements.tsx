'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import Link from 'next/link';

import { Button, buttonVariants } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';

export type GhostRoundedIconButtonClassNames = {
  root?: string;
  label?: string;
  iconWrapper?: string;
};

export type GhostRoundedIconButtonProps = Omit<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'children' | 'href'
> & {
  shadow?: string;
  icon?: ReactNode;
  label: ReactNode;
  /** Icon before (`start`) or after (`end`) the label. Default `end`. */
  iconPosition?: 'start' | 'end';
  size?: 'md' | 'lg' | 'responsive';
  classNames?: GhostRoundedIconButtonClassNames;
  /** When set, renders a Next.js `Link` with the same visual treatment as the ghost rounded button. */
  href?: string;
  prefetch?: boolean;
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
  href,
  prefetch = false,
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

  const layoutClassName = cn(
    shadow,
    className,
    icon ? (iconPosition === 'start' ? 'pl-2' : 'pr-2') : '',
    classNames?.root
  );

  const content =
    iconPosition === 'start' ? (
      <>
        {icon && iconEl}
        {labelEl}
      </>
    ) : (
      <>
        {labelEl}
        {icon && iconEl}
      </>
    );

  if (href) {
    const { disabled: _disabled, ...linkProps } = props;
    return (
      <Link
        {...(linkProps as ComponentProps<typeof Link>)}
        href={href}
        prefetch={prefetch}
        className={cn(buttonVariants({ variant: 'ghost', size }), 'rounded-full!', layoutClassName)}
      >
        {content}
      </Link>
    );
  }

  return (
    <Button rounded variant="ghost" size={size} type={type} className={layoutClassName} {...props}>
      {content}
    </Button>
  );
}

export type TabMenuItem = {
  key: string;
  label: string;
};

export type TabItem = {
  key: string;
  label: string;
  menuItems?: ReadonlyArray<TabMenuItem>;
};

const tabButtonClass = (isActive: boolean) =>
  cn(
    'text-primary-9 h-10 min-w-28 px-7 text-lg font-normal transition-[background-color,box-shadow,color] duration-200',
    'focus-visible:ring-primary-6 focus-visible:ring-2',
    {
      'shadow-[0_18px_28px_-18px_rgba(0,39,102,0.7)] text-white! hover:bg-primary-8': isActive,
    },
    { 'hover:bg-gray-200 hover:text-primary-9': !isActive }
  );

export function PanelTabs({
  activeKey,
  items,
  onMenuItemSelect,
  onSectionSelect,
}: {
  activeKey: string;
  items: Array<TabItem>;
  /** Plain section tabs only (dropdown tabs never call this). */
  onSectionSelect?: (sectionKey: string) => void;
  /** Dropdown menu entries only; `tabKey` is the parent tab’s `key`. */
  onMenuItemSelect?: (args: { itemKey: string; tabKey: string }) => void;
}) {
  return (
    <nav
      aria-label="Workspace manager sections"
      className="flex min-w-0 items-center gap-1"
      data-testid="workspace-manager-section-tabs"
      id="workspace-manager-section-tabs"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const tabId = `workspace-manager-tab-${item.key}`;

        if (item.menuItems?.length) {
          return (
            <DropdownMenu key={item.key}>
              <DropdownMenuTrigger asChild>
                <Button
                  rounded
                  type="button"
                  variant={isActive ? 'default' : 'ghost'}
                  active={isActive}
                  size="responsive"
                  className={cn(
                    tabButtonClass(isActive),
                    'inline-flex min-w-28 items-center justify-center gap-2 px-5'
                  )}
                  data-testid={tabId}
                  id={tabId}
                  aria-haspopup="menu"
                >
                  <span>{item.label}</span>
                  <RiArrowDownSLine className="size-5 opacity-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-white bg-white min-w-48 border p-1 shadow-bnb rounded-2xl z-9999"
              >
                {item.menuItems.map((menuItem) => (
                  <DropdownMenuItem
                    key={menuItem.key}
                    className="cursor-pointer hover:font-bold px-3 py-2 text-base text-primary-9 focus:bg-gray-100 focus:text-primary-9 rounded-2xl"
                    onSelect={() => onMenuItemSelect?.({ itemKey: menuItem.key, tabKey: item.key })}
                  >
                    {menuItem.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Button
            rounded
            key={item.key}
            type="button"
            variant={isActive ? 'default' : 'ghost'}
            active={isActive}
            size="responsive"
            className={tabButtonClass(isActive)}
            data-testid={tabId}
            id={tabId}
            onClick={() => onSectionSelect?.(item.key)}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
