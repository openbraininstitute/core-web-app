import NextLink from 'next/link';
import { RightOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import { cn } from '@/utils/css-class';

export default function Tab({
  children,
  highlight,
  href,
  variant = 'light',
}: {
  children: ReactNode;
  highlight: boolean;
  href: string;
  variant?: 'light' | 'onPrimary';
}) {
  return (
    <NextLink
      href={href}
      className={cn(
        'flex h-[50px] w-full items-center justify-between rounded-full p-3 pl-5 text-base font-bold shadow-sm',
        variant === 'onPrimary'
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
      <div className={variant === 'onPrimary' ? 'text-white/70' : 'text-gray-500'}>
        <RightOutlined className={highlight ? 'text-white' : ''} />
      </div>
    </NextLink>
  );
}
