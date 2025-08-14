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
    <a
      href={href}
      className={cn(
        'flex h-[50px] w-full items-center justify-between rounded-full p-3 shadow-sm',
        highlight ? 'bg-primary-8 text-white' : 'bg-white'
      )}
    >
      {children}
      <div className="text-gray-500">
        <RightOutlined />
      </div>
    </a>
  );
}
