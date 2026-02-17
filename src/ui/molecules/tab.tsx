import { RightOutlined } from '@ant-design/icons';
import NextLink from 'next/link';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Tab({
  children,
  highlight,
  href,
}: {
  children: ReactNode;
  highlight: boolean;
  href: string;
}) {
  return (
    <NextLink
      href={href}
      className={cn(
        'hover:bg-primary-8 flex h-[50px] w-full items-center justify-between rounded-full p-3 pl-5 text-base font-bold shadow-sm hover:text-white',
        highlight ? 'bg-primary-8 text-white' : 'text-primary-9 bg-white'
      )}
    >
      {children}
      <div className="text-gray-500">
        <RightOutlined className={highlight ? 'text-white' : ''} />
      </div>
    </NextLink>
  );
}
