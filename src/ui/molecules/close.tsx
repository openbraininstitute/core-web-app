'use client';

import { CloseOutlined } from '@ant-design/icons';
import NextLink from 'next/link';

import { cn } from '@/utils/css-class';

export default function Close({
  href,
  className,
  variant = 'light',
}: {
  href: string;
  className?: string;
  variant?: 'light' | 'onPrimary';
}) {
  return (
    <NextLink
      href={href}
      className={cn(
        'flex items-center justify-center rounded-full p-2',
        variant === 'onPrimary'
          ? 'text-white hover:bg-white/20 hover:text-white'
          : 'text-neutral-5 hover:bg-white hover:text-primary-6 hover:shadow-bnb',
        className
      )}
      title="Close"
    >
      <CloseOutlined />
    </NextLink>
  );
}
