/* eslint-disable react/jsx-props-no-spreading */

'use client';

import Icon, { DownOutlined } from '@ant-design/icons';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-80 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary-9 text-white shadow-xs hover:bg-primary-9/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        success:
          'bg-accent-dark text-white shadow-xs hover:bg-accent-dark/90 focus-visible:ring-accent-light/20 disabled:text-white!',
        outline:
          'border bg-white text-primary-9 border-neutral-2 shadow-xs  hover:not(:disabled):text-white  hover:not(:disabled):bg-primary-9 active:bg-primary-9',
        ghost: 'hover:bg-neutral-1 hover:text-primary-9',
        link: 'text-primary underline-offset-4 hover:underline',
        icon: '',
        shadow: cn(
          'flex w-full px-8 py-6 bg-linear-to-r from-primary-8 to-primary-10 text-white',
          'hover:from-primary-9 hover:to-primary-10/70'
        ),
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-sm gap-1.5 text-sm py-3 px-3 has-[>svg]:px-2.5',
        md: 'h-10 rounded-md gap-1.5 text-base py-3 px-4 has-[>svg]:px-3',
        lg: 'h-12 rounded-lg py-3 px-6 text-lg has-[>svg]:px-4',
        responsive: `h-10 rounded-md gap-1.5 text-md py-3 px-4 has-[>svg]:px-3 xl:h-12 xl:rounded-lg xl:py-3 xl:px-6 xl:text-lg xl:has-[>svg]:px-4`,
      },
      active: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
    compoundVariants: [
      {
        active: true,
        variant: 'default',
        className: '',
      },
      {
        active: true,
        variant: 'outline',
        className: 'bg-primary-9 text-white',
      },
      {
        active: true,
        variant: 'ghost',
        className: 'bg-neutral-1 text-primary-9 font-semibold',
      },
      {
        size: 'sm',
        variant: 'icon',
        className: 'h-8 w-8 size-8!',
      },
      {
        size: 'md',
        variant: 'icon',
        className: 'h-10 w-10 size-10!',
      },
      {
        size: 'lg',
        variant: 'icon',
        className: 'h-12 w-12 size-12!',
      },
    ],
  }
);

function Button({
  className,
  variant,
  size,
  ref,
  rounded,
  borderless,
  active,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    rounded?: boolean;
    active?: boolean;
    borderless?: boolean;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      role="button"
      data-slot="button"
      className={cn(buttonVariants({ variant, size, active, className }), {
        'rounded-full!': rounded,
        'border-none!': borderless,
      })}
      {...props}
    />
  );
}

interface ButtonArrowProps extends React.SVGProps<SVGSVGElement> {
  icon?: typeof Icon;
}

function ButtonArrow({ icon: UIcon = DownOutlined, className }: ButtonArrowProps) {
  return (
    <Icon component={UIcon} data-slot="button-arrow" className={cn('ms-auto -me-1', className)} />
  );
}

export { Button, ButtonArrow, buttonVariants };
