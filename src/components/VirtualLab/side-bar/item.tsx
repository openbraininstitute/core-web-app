'use client';

import { ReactNode, type JSX } from 'react';
import Link from 'next/link';

import { classNames } from '@/util/utils';

export type Props = {
  url: string;
  active?: boolean;
  title: ReactNode;
  icon?: JSX.Element;
  count?: number;
  disabled?: boolean;
};

export default function Item({ title, url, icon, disabled, count, active = false }: Props) {
  return (
    <Link
      href={url}
      className={classNames(
        'group flex items-center gap-3 px-4 py-3 transition-all duration-200',
        'border-primary-7 border-b last:border-b-0',
        disabled
          ? 'disabled cursor-not-allowed text-gray-400 hover:bg-transparent'
          : 'hover:text-primary-8 hover:bg-white',
        active && 'active text-primary-9! bg-white'
      )}
      aria-disabled={disabled}
    >
      {icon}
      {title}
      {count && (
        <span className="text-primary-3 ml-auto font-bold group-hover:text-gray-400">{count}</span>
      )}
    </Link>
  );
}
