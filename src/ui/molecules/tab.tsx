import { RiArrowRightSLine } from '@remixicon/react';
import NextLink from 'next/link';

import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Tab({
  children,
  highlight,
  href,
  variant = ViewVariant.Light,
}: {
  children: ReactNode;
  highlight: boolean;
  href: string;
  variant?: TViewVariant;
}) {
  return (
    <NextLink
      href={href}
      className={cn(
        'flex group w-full items-center justify-between rounded-full p-3 pl-5 text-base font-bold shadow-xs border border-gray-100',
        'h-10 xl:h-12 text-md xl:text-lg gap-1.5 py-3 px-4 pr-2! p xl:px-6 xl:pr-2!',
        variant === ViewVariant.Default
          ? cn(
              'hover:bg-primary-8 text-white hover:text-white!',
              highlight
                ? 'bg-primary-9 text-white border-primary-9 active:bg-primary-8 active:text-white'
                : 'bg-transparent text-white/90'
            )
          : cn(
              'hover:bg-primary-8 hover:text-white',
              highlight
                ? 'bg-primary-9 text-white border-primary-9 active:bg-primary-8 active:text-white'
                : 'text-primary-9 bg-white'
            )
      )}
    >
      {children}
      <RiArrowRightSLine
        className={cn(
          'size-4 lg:size-5 2xl:size-6 group-hover:scale-115 transition-transform duration-200 ease-out-expo'
        )}
      />
    </NextLink>
  );
}
