import { RightOutlined } from '@ant-design/icons';
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
        'flex h-[50px] w-full items-center justify-between rounded-full p-3 pl-5 text-base font-bold shadow-sm',
        variant === ViewVariant.Default
          ? cn(
              'hover:bg-primary-8 text-white hover:text-white',
              highlight ? 'bg-primary-8 text-white' : 'bg-transparent text-white/90'
            )
          : cn(
              'hover:bg-primary-8 hover:text-white',
              highlight ? 'bg-primary-8 text-white' : 'text-primary-9 bg-white'
            )
      )}
    >
      {children}
      <div className={variant === ViewVariant.Default ? 'text-white/70' : 'text-gray-500'}>
        <RightOutlined className={cn({ 'text-white': highlight })} />
      </div>
    </NextLink>
  );
}
