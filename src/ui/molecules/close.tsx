'use client';

import { CloseOutlined } from '@ant-design/icons';
import NextLink from 'next/link';

export default function Close({ href }: { href: string }) {
  return (
    <NextLink href={href}>
      <CloseOutlined className="absolute top-0 right-0 text-2xl" />
    </NextLink>
  );
}
