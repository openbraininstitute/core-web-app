import Link from 'next/link';

import { type TViewVariant, ViewVariant } from '@/constants';
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
  const { children, icon, variant = ViewVariant.Light, destructive } = props;
  const className = cn(
    'group border flex w-full cursor-pointer items-center justify-between gap-3 pl-4 pr-2! py-2! rounded-full',
    'h-10 gap-1.5 text-md py-3 px-4 has-[>svg]:px-3 xl:h-12 xl:py-3 xl:px-6 xl:text-lg xl:has-[>svg]:px-4',
    !destructive && {
      'border-gray-50 hover:text-primary-7! hover:shadow-xs hover:bg-gray-50  hover:border-gray-100 active:bg-primary-8 active:text-white!':
        variant === ViewVariant.Light,
      'bg-primary-9 text-white hover:text-white! hover:shadow-xs hover:bg-primary-9 border border-gray-50 hover:border-gray-100 active:bg-primary-8 active:text-white!':
        variant === ViewVariant.Default,
    },
    destructive &&
      'from-destructive via-destructive/80 to-destructive border-white/20 bg-linear-to-r bg-size-[200%_100%] text-white hover:text-white! hover:shadow-xs'
  );

  const content = (
    <>
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'ml-auto flex size-8! min-h-8! min-w-8! p-0.5 items-center justify-center rounded-full border',
          !destructive && {
            'border-white/40 group-hover:bg-white/10 group-hover:text-white':
              variant === ViewVariant.Default,
            'group-hover:text-primary-7! group-hover:shadow-sm border-gray-100 group-active:text-white!':
              variant === ViewVariant.Light,
          },
          destructive && 'border-white/40 group-hover:bg-white/10 group-hover:text-white'
        )}
      >
        {icon}
      </div>
    </>
  );

  const buttonVariant = destructive ? 'default' : 'outline';

  if (props.kind === ActionKind.Link) {
    return (
      <Button
        rounded
        size="responsive"
        type="button"
        variant={buttonVariant}
        className={className}
        asChild
      >
        <Link href={props.href} className={className}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      rounded
      type="button"
      variant={buttonVariant}
      onClick={props.onClick}
      className={className}
    >
      {content}
    </Button>
  );
}
