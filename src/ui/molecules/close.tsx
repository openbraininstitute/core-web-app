'use client';

import { CloseOutlined } from '@ant-design/icons';
import NextLink from 'next/link';

import { cn } from '@/utils/css-class';

export default function Close({ href, className }: { href: string; className?: string }) {
  return (
    <NextLink
      href={href}
      className={cn(
        'hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 absolute top-3',
        'right-3 flex items-center justify-center rounded-full p-2',
        className
      )}
      title="Close"
    >
      <CloseOutlined />
    </NextLink>
  );
}
