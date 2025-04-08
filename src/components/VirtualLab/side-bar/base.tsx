'use client';

import { ReactNode } from 'react';

import { classNames } from '@/util/utils';
import Control from '@/components/VirtualLab/side-bar/control';
import LogoAsLink from '@/components/logo/as-link';

type Props = {
  children: ReactNode;
};

export default function SideBar({ children }: Props) {
  return (
    <aside
      className={classNames(
        'fixed left-5',
        'flex h-[calc(100%-2.5rem)] grow flex-col text-white',
        'w-72 transition-all duration-300 ease-in-out'
      )}
    >
      <LogoAsLink />
      {children}
      <Control />
    </aside>
  );
}
