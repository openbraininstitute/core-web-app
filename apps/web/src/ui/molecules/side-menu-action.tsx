'use client';

import Link from 'next/link';

import { type TViewVariant, ViewVariant } from '@/constants';
import { WorkflowBlockedActionTooltip } from '@/ui/segments/workflows/elements/workflow-blocked-action-tooltip';
import { cn } from '@/utils/css-class';

import { Button } from './button';

import type { ReactNode } from 'react';

export const ActionKind = {
  Button: 'button',
  Link: 'link',
} as const;

type Props = {
  children: ReactNode;
  icon: ReactNode;
  variant?: TViewVariant;
  /** renders the action with the destructive (red) color used for delete actions */
  destructive?: boolean;
  disabled?: boolean;
  /** shown in a tooltip when {@link disabled} is true */
  disabledReason?: string;
  /** lands on the rendered control, whether it is a button or a link */
  testId?: string;
} & (
  | {
      kind: typeof ActionKind.Button;
      onClick?: () => void;
      href?: never;
    }
  | {
      kind: typeof ActionKind.Link;
      href: string;
      onClick?: never;
    }
);

export function Action(props: Props) {
  const {
    children,
    icon,
    variant = ViewVariant.Light,
    destructive,
    disabled,
    disabledReason,
    testId,
  } = props;
  const className = cn(
    'group border flex w-full items-center justify-between gap-3 pl-4 pr-2! py-2! rounded-full',
    'h-10 gap-1.5 text-md py-3 px-4 has-[>svg]:px-3 xl:h-12 xl:py-3 xl:px-6 xl:text-lg xl:has-[>svg]:px-4',
    !disabled && 'cursor-pointer',
    disabled &&
      'cursor-not-allowed bg-gray-100! text-gray-400! border-gray-200! shadow-none disabled:opacity-100 hover:bg-gray-100! hover:text-gray-400! hover:shadow-none hover:border-gray-200!',
    !destructive &&
      !disabled && {
        'border-gray-50 hover:text-primary-7! hover:shadow-xs hover:bg-gray-50  hover:border-gray-100 active:bg-primary-8 active:text-white!':
          variant === ViewVariant.Light,
        'bg-primary-9 text-white hover:text-white! hover:shadow-xs hover:bg-primary-9 border border-gray-50 hover:border-gray-100 active:bg-primary-8 active:text-white!':
          variant === ViewVariant.Default,
      },
    destructive &&
      !disabled &&
      'from-destructive via-destructive/80 to-destructive border-white/20 bg-linear-to-r bg-size-[200%_100%] text-white hover:text-white! hover:shadow-xs'
  );

  const content = (
    <>
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'ml-auto flex size-8! min-h-8! min-w-8! p-0.5 items-center justify-center rounded-full border',
          !destructive &&
            !disabled && {
              'border-white/40 group-hover:bg-white/10 group-hover:text-white':
                variant === ViewVariant.Default,
              'group-hover:text-primary-7! group-hover:shadow-sm border-gray-100 group-active:text-white!':
                variant === ViewVariant.Light,
            },
          !destructive && disabled && 'border-gray-200! text-gray-400!',
          destructive && 'border-white/40 group-hover:bg-white/10 group-hover:text-white'
        )}
      >
        {icon}
      </div>
    </>
  );

  const buttonVariant = destructive ? 'default' : 'outline';
  const renderAsLink = props.kind === ActionKind.Link && !disabled;

  const control = renderAsLink ? (
    <Button
      rounded
      size="responsive"
      type="button"
      variant={buttonVariant}
      className={className}
      data-testid={testId}
      asChild
    >
      <Link href={props.href} className={className}>
        {content}
      </Link>
    </Button>
  ) : (
    <Button
      rounded
      type="button"
      variant={buttonVariant}
      onClick={disabled || props.kind === ActionKind.Link ? undefined : props.onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      {content}
    </Button>
  );

  return (
    <WorkflowBlockedActionTooltip
      reason={disabled ? disabledReason : undefined}
      fullWidth
      side="top"
      align="start"
    >
      {control}
    </WorkflowBlockedActionTooltip>
  );
}
