'use client';

import { RiCloseLine } from '@remixicon/react';
import NextLink from 'next/link';

import { cn } from '@/utils/css-class';

export default function Close({ href, className }: { href: string; className?: string }) {
  return (
    <NextLink
      href={href}
      className={cn(
        'hover:bg-white text-neutral-5 hover:text-primary-6 ',
        'flex items-center justify-center rounded-full p-2 hover:shadow-bnb',
        className
      )}
      title="Close"
    >
      <RiCloseLine className="size-4" />
    </NextLink>
  );
}
