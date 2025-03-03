'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

import { classNames } from '@/util/utils';

type Props = {
  url: string;
  active?: boolean;
  title: ReactNode;
  icon?: JSX.Element;
};

export default function Item({ title, url, icon, active = false }: Props) {
  return (
    <Link
      href={url}
      className={classNames(
        'group flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-primary-5 ',
        'border-b border-primary-5 last:border-b-0',
        active && 'active bg-primary-5'
      )}
    >
      {icon}
      {title}
    </Link>
  );
}
