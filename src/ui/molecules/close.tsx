'use client';

import { CloseOutlined } from '@ant-design/icons';
import NextLink from 'next/link';

export default function Close({ href }: { href: string }) {
  return (
    <NextLink
      href={href}
      className="hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 absolute top-3 right-3 flex items-center justify-center rounded-full p-1 p-2"
      title="Close"
    >
      <CloseOutlined className="text-xl" />
    </NextLink>
  );
}
