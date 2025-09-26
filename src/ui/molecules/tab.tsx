import NextLink from 'next/link';
import { RightOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import { cn } from '@/utils/css-class';

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
        'hover:bg-primary-8 flex h-[50px] w-full items-center justify-between rounded-full p-3 pl-5 font-bold shadow-sm hover:text-white',
        highlight ? 'bg-primary-8 text-white' : 'bg-white'
      )}
    >
      {children}
      <div className="text-gray-500">
        <RightOutlined className={highlight ? 'text-white' : ''} />
      </div>
    </NextLink>
  );
}
