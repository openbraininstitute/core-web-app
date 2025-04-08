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
        'group flex items-center gap-3 px-4 py-3 transition-all duration-200 ',
        'border-b border-primary-7 last:border-b-0',
        disabled
          ? 'disabled cursor-not-allowed text-gray-400 hover:bg-transparent'
          : 'hover:bg-white hover:text-primary-8',
        active && 'active bg-white text-primary-9!'
      )}
      aria-disabled={disabled}
    >
      {icon}
      {title}
      {count && (
        <span className="ml-auto font-bold text-primary-3 group-hover:text-gray-400">{count}</span>
      )}
    </Link>
  );
}
